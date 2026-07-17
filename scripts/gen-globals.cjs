#!/usr/bin/env node
// Regenera EN main.js el bloque que publica en `window` lo que los handlers inline necesitan.
//
// POR QUÉ: los ~560 handlers inline (`onclick="foo()"`, `oninput="editState.x=this.value"`) resuelven sus
// nombres contra el scope GLOBAL. Mientras el JS fue un <script> clásico, las funciones Y las variables
// top-level (let/const incluidos: viven en el global lexical environment) eran visibles. Como MÓDULO (Vite)
// el scope es propio → sin este bloque, botones y FORMULARIOS mueren EN SILENCIO.
//
// Publica DOS cosas distintas:
//   1. FUNCIONES llamadas en handlers → Object.assign(window, {...}) (copia del valor: las funciones
//      declaradas no se reasignan).
//   2. VARIABLES de estado referenciadas en handlers (p.ej. oninput="editState.nombre=this.value") →
//      ACCESORES VIVOS (Object.defineProperties get/set que leen/escriben la variable actual del módulo).
//      Una copia NO sirve: estas variables se REASIGNAN (editState = {...} al abrir cada sheet) y la copia
//      quedaría apuntando al objeto viejo. `let/var` → get+set; `const`/importados → solo get.
//      (Bug real 2026-07-16: "el nombre es obligatorio" al crear cliente/prospecto — lo tipeado nunca
//      llegaba al estado porque editState/prospectoState/… no eran visibles desde el HTML. 27 variables.)
//
// Se genera automáticamente (nunca a mano) y tests/globals.test.mjs verifica con el MISMO análisis que no
// falte ninguno. El bloque vive entre marcadores DENTRO de main.js (mismo patrón que @calculos) porque solo
// desde ahí se ve el scope del módulo. Uso: node scripts/gen-globals.cjs  (lo corre `npm run build`).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MAIN = path.join(ROOT, 'src/main.js');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let main = fs.readFileSync(MAIN, 'utf8');
// Los demás módulos de src/ (i18n.js, y los que vengan al partir main.js): sus handlers cuentan igual.
// main.js sigue siendo el único que PUBLICA (ve el scope del módulo: lo declarado ahí + lo importado).
// Si un corte futuro mueve una función/variable usada por handlers, main.js debe importarla.
const otros = fs
  .readdirSync(path.join(ROOT, 'src'))
  .filter(f => f.endsWith('.js') && f !== 'main.js')
  .map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'));

const START = '/* @globals:start — GENERADO por scripts/gen-globals.cjs · NO editar a mano */';
const END = '/* @globals:end */';

// Analizar SIN el bloque generado (para no retroalimentarse).
const limpio = main.includes(START) ? main.slice(0, main.indexOf(START)) : main;

// ── 1) Identificadores usados desde CUALQUIER handler inline (HTML estático + HTML generado por el JS) ──
// on[a-z]+ cubre TODO evento (onkeydown, onerror, lo que venga) — la lista fija anterior dejó afuera onkeydown.
const reHandler = /\bon[a-z]+\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/gi;
// Estilo PROPIEDAD DE OBJETO: onclick: 'openMisEquipos()' — lo usan las ALERTAS (alertas.js arma
// { onclick: '...' } y renderAlertsBanner lo inyecta como atributo en runtime). El regex de atributo no lo
// ve porque en el fuente no hay `onclick="..."` literal. Bug real 17/07 (día 1 del sistema de reportes):
// "Can't find variable: openMisEquipos" al tocar la alerta del viernes del operario.
const reObjHandler = /\bon[a-z]+\s*:\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/gi;

// llamadas: foo(...)  ·  peladas: editState.x=…, serviceState.avance=… (el identificador raíz, sin llamar)
const usadosCall = new Set();
const usadosBare = new Set();
function scanHandlerBody(raw) {
  // NO se descartan las interpolaciones ${…}: hay handlers construidos enteros por una (p.ej. el paso
  // Resultado del operario: onclick="${cond ? `selectResultadoPrueba(…)` : `selectResultado(…)`}") y sus
  // llamadas SON runtime. Publicar de más (un identificador build-time) es inofensivo; de menos, fatal.
  const body = raw
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/'(?:\\.|[^'\\])*'/g, "''") // strings dentro del handler: no son identificadores
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
  const reIdent = /[a-zA-Z_$][\w$]*/g;
  let im;
  while ((im = reIdent.exec(body))) {
    const prev = body.slice(0, im.index).trimEnd().slice(-1);
    if (prev === '.') continue; // propiedad (x.y) → no resuelve contra el global
    const next = body.slice(im.index + im[0].length).trimStart()[0];
    (next === '(' ? usadosCall : usadosBare).add(im[0]);
  }
}
for (const src of [html, limpio, ...otros]) {
  let m;
  while ((m = reHandler.exec(src))) scanHandlerBody(m[2]);
  while ((m = reObjHandler.exec(src))) scanHandlerBody(m[2]);
}

// ── 2) Qué es cada nombre en el scope de main.js: function / let / var / const / import ──
const kind = new Map();
for (const m of limpio.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/gm))
  kind.set(m[1], 'function');
for (const m of limpio.matchAll(/^(?:export\s+)?(let|var|const)\s+([a-zA-Z_$][\w$]*)/gm))
  if (!kind.has(m[2])) kind.set(m[2], m[1]);
// Importados: en el scope de main → publicables. Su binding NO es reasignable desde main → accessor solo-get
// (si es una función que los handlers llaman, va por Object.assign como siempre).
for (const m of limpio.matchAll(/^import\s*\{([^}]+)\}\s*from/gm))
  for (const n of m[1].split(',')) {
    const name = n.trim().split(/\s+as\s+/).pop().trim();
    if (name && !kind.has(name)) kind.set(name, 'import');
  }

// ── 3) Partición: funciones (valor estable) vs estado (accesor vivo) ──
const funcs = [...usadosCall]
  .filter(n => kind.get(n) === 'function' || (kind.get(n) === 'import' && !usadosBare.has(n)))
  .sort();
// Variables referenciadas por handlers (peladas, o llamadas pero guardadas en let como _porCobrarOnConfirm):
// siempre accesor — una copia en window quedaría OBSOLETA en cuanto el módulo las reasigne.
const vars = [...new Set([...usadosBare, ...usadosCall])]
  .filter(n => ['let', 'var', 'const', 'import'].includes(kind.get(n)))
  .filter(n => !funcs.includes(n))
  .sort();

const accesor = n =>
  kind.get(n) === 'let' || kind.get(n) === 'var'
    ? `  ${n}: { get: () => ${n}, set: v => { ${n} = v; }, configurable: true },`
    : `  ${n}: { get: () => ${n}, configurable: true },`;

const bloque =
  START +
  '\n// Los handlers inline (onclick="…") buscan estas FUNCIONES en window. Ver scripts/gen-globals.cjs.\n' +
  'Object.assign(window, {\n' +
  funcs.map(n => '  ' + n + ',').join('\n') +
  '\n});\n' +
  '// ESTADO de módulo usado por handlers inline (oninput="editState.x=this.value"): accesores VIVOS,\n' +
  '// no copias — leen y escriben la variable ACTUAL del módulo aunque se reasigne (editState = {...}).\n' +
  'Object.defineProperties(window, {\n' +
  vars.map(accesor).join('\n') +
  '\n});\n' +
  END;

main = main.includes(START)
  ? main.slice(0, main.indexOf(START)) + bloque + main.slice(main.indexOf(END) + END.length)
  : main.replace(/\s*$/, '\n\n') + bloque + '\n';

fs.writeFileSync(MAIN, main);
fs.writeFileSync(path.join(ROOT, 'src/globals.json'), JSON.stringify({ funcs, vars }, null, 0) + '\n');
console.log(
  `✓ main.js: bloque @globals con ${funcs.length} funciones + ${vars.length} variables de estado publicadas en window`
);
