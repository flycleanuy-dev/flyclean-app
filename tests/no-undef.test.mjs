// Guardia de IDENTIFICADORES SIN RESOLVER en los módulos de src/ (nace del incidente 16/07: al extraer
// dashboards.js quedó `tipoServicioList` sin importar → "Can't find variable" EN PRODUCCIÓN al abrir
// Métricas; y reporte.js tenía el mismo hueco dormido desde v197 — habría reventado al generar un PDF).
//
// Los cortes de la modularización mueven código entre archivos; un import olvidado NO rompe el build
// (Vite no chequea scope entre módulos con side-effects) y explota recién en runtime al ejecutar esa
// pantalla. Este test corre eslint `no-undef` sobre CADA módulo con los globals de navegador permitidos:
// cualquier identificador no declarado/no importado = rojo ANTES de deployar.
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(root + 'src').filter(f => f.endsWith('.js')).map(f => 'src/' + f);

const cfgPath = root + 'tests/.eslint-undef.tmp.mjs';
writeFileSync(cfgPath, `export default [{
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: Object.fromEntries([
    'window','document','localStorage','navigator','fetch','console','setTimeout','setInterval',
    'clearTimeout','clearInterval','indexedDB','alert','confirm','prompt','URL','URLSearchParams','Blob',
    'File','FileReader','FormData','Image','atob','btoa','location','history','performance','crypto',
    'requestAnimationFrame','cancelAnimationFrame','Event','CustomEvent','AbortController','structuredClone','screen',
    'getComputedStyle','IntersectionObserver','ResizeObserver','PerformanceObserver','XMLHttpRequest',
    'WebSocket','Notification','caches','matchMedia','open','scrollTo','innerWidth','innerHeight',
    'devicePixelRatio','DOMParser','MutationObserver','ImageBitmap','createImageBitmap','OffscreenCanvas',
  ].map(g => [g, 'readonly'])) },
  rules: { 'no-undef': 'error' },
}];\n`);

let bad = 0;
try {
  for (const f of files) {
    try {
      execFileSync('npx', ['eslint', '--no-config-lookup', '--config', cfgPath, f], {
        cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      const out = String(e.stdout || '') + String(e.stderr || '');
      const lines = out.split('\n').filter(l => l.includes('no-undef'));
      if (lines.length) {
        bad += lines.length;
        console.error(`❌ ${f}: ${lines.length} identificador(es) sin resolver:`);
        for (const l of [...new Set(lines)].slice(0, 10)) console.error('  ' + l.trim());
      } else {
        // eslint falló SIN reportar no-undef → error de PARSEO u otro fatal (ej. una llave sin cerrar
        // tras un corte de modularización, incidente 17/07). Antes esto pasaba EN SILENCIO.
        bad += 1;
        console.error(`❌ ${f}: eslint falló sin reportar no-undef (¿error de sintaxis?):`);
        for (const l of out.split('\n').filter(Boolean).slice(0, 6)) console.error('  ' + l.trim());
      }
    }
  }
} finally {
  rmSync(cfgPath, { force: true });
}

if (bad) {
  console.error('→ falta un import (o un alias del puente M) en ese módulo.');
  process.exit(1);
}
console.log(`✅ no-undef: ${files.length} módulos de src/ sin identificadores sin resolver`);
