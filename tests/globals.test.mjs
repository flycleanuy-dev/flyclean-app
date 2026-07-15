// Red de seguridad del paso a MÓDULOS (Vite, 15/07).
//
// El riesgo: los 443 handlers inline (`onclick="foo()"`) buscan `foo` en window. Como módulo, el scope es
// propio → si una función no se publica, ese botón muere EN SILENCIO (ningún otro test lo nota, la app
// carga igual). Este test compara, estáticamente:
//    handlers usados en el HTML/JS  vs  bloque @globals de src/main.js
// y falla si falta alguno (o si el bloque quedó desactualizado tras tocar el código).
// Correr `node scripts/gen-globals.cjs` regenera el bloque.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const main = readFileSync(new URL('src/main.js', root), 'utf8');
// Los demás módulos de src/ cuentan igual (sus handlers y sus declaraciones) — mismo criterio que
// scripts/gen-globals.cjs. Si los dos divergen, este test daría un falso verde.
const otros = readdirSync(fileURLToPath(new URL('src/', root)))
  .filter(f => f.endsWith('.js') && f !== 'main.js')
  .map(f => readFileSync(new URL('src/' + f, root), 'utf8'));

const START = '/* @globals:start';
const END = '/* @globals:end */';
if (!main.includes(START)) {
  console.error('❌ src/main.js no tiene el bloque @globals — corré: node scripts/gen-globals.cjs');
  process.exit(1);
}

// Lo que el bloque publica hoy
const bloque = main.slice(main.indexOf(START), main.indexOf(END));
const publicadas = new Set([...bloque.matchAll(/^\s{2}([a-zA-Z_$][\w$]*),$/gm)].map(m => m[1]));

// Lo que los handlers necesitan (mismo análisis que gen-globals.cjs, sin el bloque generado)
const limpio = main.slice(0, main.indexOf(START));
const usados = new Set();
const reHandler =
  /\bon(?:click|change|input|submit|keyup|keypress|focus|blur|error|load)\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/gi;
for (const src of [html, limpio, ...otros]) {
  let m;
  while ((m = reHandler.exec(src))) {
    for (const f of m[2].matchAll(/([a-zA-Z_$][\w$]*)\s*\(/g)) usados.add(f[1]);
  }
}
const declaradas = new Set();
for (const src of [limpio, ...otros]) {
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/gm))
    declaradas.add(m[1]);
  for (const m of src.matchAll(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/gm))
    declaradas.add(m[1]);
}
const necesarias = [...usados].filter(n => declaradas.has(n));

const faltan = necesarias.filter(n => !publicadas.has(n));
const sobran = [...publicadas].filter(n => !declaradas.has(n)); // publicada pero ya no existe → ReferenceError en build

if (faltan.length) {
  console.error(`❌ ${faltan.length} función(es) que usan los botones NO están publicadas en window:`);
  console.error('   ' + faltan.join(', '));
  console.error('   → corré: node scripts/gen-globals.cjs');
  process.exit(1);
}
if (sobran.length) {
  console.error(`❌ ${sobran.length} función(es) publicadas que ya NO existen (rompen el build):`);
  console.error('   ' + sobran.join(', '));
  console.error('   → corré: node scripts/gen-globals.cjs');
  process.exit(1);
}
console.log(`✅ globals: ${publicadas.size} funciones publicadas — todos los handlers inline resuelven`);
