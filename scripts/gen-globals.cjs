#!/usr/bin/env node
// Regenera EN main.js el bloque que publica en `window` las funciones que los handlers inline necesitan.
//
// POR QUÉ: los 443 `onclick="foo()"` del HTML buscan `foo` en window. Mientras el JS fue un <script>
// clásico eso pasaba solo (scope global). Como MÓDULO (Vite) el scope es propio → sin esto los botones
// mueren EN SILENCIO. Se genera automáticamente (nunca a mano) y tests/globals.test.mjs verifica que no
// falte ninguno. Al partir main.js en módulos, basta re-correrlo.
//
// El bloque vive entre marcadores DENTRO de main.js (mismo patrón que @calculos) porque solo desde ahí
// se ve el scope del módulo. Uso: node scripts/gen-globals.cjs  (lo corre `npm run build`).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MAIN = path.join(ROOT, 'src/main.js');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let main = fs.readFileSync(MAIN, 'utf8');

const START = '/* @globals:start — GENERADO por scripts/gen-globals.cjs · NO editar a mano */';
const END = '/* @globals:end */';

// Analizar SIN el bloque generado (para no retroalimentarse).
const limpio = main.includes(START) ? main.slice(0, main.indexOf(START)) : main;

// 1) Identificadores invocados desde CUALQUIER handler inline (HTML estático + HTML generado por el JS).
const usados = new Set();
const reHandler =
  /\bon(?:click|change|input|submit|keyup|keypress|focus|blur|error|load)\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/gi;
for (const src of [html, limpio]) {
  let m;
  while ((m = reHandler.exec(src))) {
    for (const f of m[2].matchAll(/([a-zA-Z_$][\w$]*)\s*\(/g)) usados.add(f[1]);
  }
}
// 2) Quedarse solo con las declaradas en el top-level (descarta builtins/métodos: setTimeout, if, .add…).
const declaradas = new Set();
for (const m of limpio.matchAll(/^(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/gm)) declaradas.add(m[1]);
for (const m of limpio.matchAll(/^(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=/gm)) declaradas.add(m[1]);

const exponer = [...usados].filter(n => declaradas.has(n)).sort();

const bloque =
  START +
  '\n// Los handlers inline (onclick="…") buscan estas funciones en window. Ver scripts/gen-globals.cjs.\n' +
  'Object.assign(window, {\n' +
  exponer.map(n => '  ' + n + ',').join('\n') +
  '\n});\n' +
  END;

main = main.includes(START)
  ? main.slice(0, main.indexOf(START)) + bloque + main.slice(main.indexOf(END) + END.length)
  : main.replace(/\s*$/, '\n\n') + bloque + '\n';

fs.writeFileSync(MAIN, main);
fs.writeFileSync(path.join(ROOT, 'src/globals.json'), JSON.stringify(exponer, null, 0) + '\n');
console.log(`✓ main.js: bloque @globals con ${exponer.length} funciones publicadas en window`);
