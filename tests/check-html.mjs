// Chequeo de sintaxis del front + coherencia del index.html. Lo corre el CI en cada PR.
//
// Layout actual (modularización 15/07): el JS vive en src/ como MÓDULOS ES (Vite los bundlea) y el
// index.html solo referencia el entry (`<script type="module" src="/src/main.js">`). Este test:
//   1. verifica que TODOS los módulos de src/ parseen — con `node --check`, que respeta el "type":"module"
//      del package.json (`new Function()` ya no sirve: no admite `import`);
//   2. verifica que index.html referencie el entry (si un refactor queda a medias, la app cargaría SIN
//      JavaScript y ningún otro test lo notaría);
//   3. verifica que no haya JS inline suelto en index.html (que el monolito no vuelva por la ventana).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const srcDir = fileURLToPath(new URL('src/', root));

// 2) El entry tiene que estar referenciado.
if (!/<script[^>]*\bsrc=["']\/src\/main\.js["']/.test(html)) {
  console.error('❌ index.html no referencia /src/main.js — la app quedaría sin JavaScript.');
  process.exit(1);
}

// 1) Todos los módulos de src/ parsean.
const modulos = readdirSync(srcDir).filter(f => f.endsWith('.js'));
let lineas = 0;
for (const f of modulos) {
  try {
    execFileSync(process.execPath, ['--check', srcDir + f], { stdio: 'pipe' });
  } catch (e) {
    console.error(`❌ SYNTAX ERROR en src/${f}:\n${(e.stderr || '').toString().slice(0, 600)}`);
    process.exit(1);
  }
  lineas += readFileSync(srcDir + f, 'utf8').split('\n').length;
}

// 3) JS inline residual en index.html (debería ser 0; si aparece, se valida igual).
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m,
  inline = '',
  n = 0;
while ((m = re.exec(html))) {
  if (!m[1].trim()) continue;
  inline += '\n;{\n' + m[1] + '\n};\n';
  n++;
}
if (n) {
  try {
    new Function(inline);
  } catch (e) {
    console.error('❌ SYNTAX ERROR en el JS inline de index.html:', e.message);
    process.exit(1);
  }
}

console.log(
  `✅ src/: ${modulos.length} módulo(s) parsean (${lineas} líneas) — ${modulos.join(', ')} · index.html referencia el entry` +
    (n ? ` · ${n} bloque(s) inline OK` : ' · sin JS inline')
);
