// Red de seguridad del paso a MÓDULOS (Vite, 15/07) — ampliada el 16/07 tras el bug de los formularios.
//
// El riesgo (DOS clases):
//   1. FUNCIONES: `onclick="foo()"` busca `foo` en window → si no se publica, el botón muere EN SILENCIO.
//   2. VARIABLES: `oninput="editState.nombre=this.value"` busca `editState` en el scope global → si no se
//      publica como ACCESOR VIVO, lo tipeado nunca llega al estado ("el nombre es obligatorio" con el
//      nombre escrito — bug real en producción 16/07: 27 variables, clientes/prospectos/notas del operario).
//
// Este test replica el análisis de scripts/gen-globals.cjs y falla si el bloque @globals de src/main.js
// no publica algo que los handlers usan (o publica algo que ya no existe). Correr
// `node scripts/gen-globals.cjs` regenera el bloque.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const main = readFileSync(new URL('src/main.js', root), 'utf8');
// Los demás módulos de src/ cuentan igual (sus handlers) — mismo criterio que gen-globals.cjs.
// Si los dos análisis divergen, este test daría un falso verde.
const otros = readdirSync(fileURLToPath(new URL('src/', root)))
  .filter(f => f.endsWith('.js') && f !== 'main.js')
  .map(f => readFileSync(new URL('src/' + f, root), 'utf8'));

const START = '/* @globals:start';
const END = '/* @globals:end */';
if (!main.includes(START)) {
  console.error('❌ src/main.js no tiene el bloque @globals — corré: node scripts/gen-globals.cjs');
  process.exit(1);
}

// ── Lo que el bloque publica hoy ──
const bloque = main.slice(main.indexOf(START), main.indexOf(END));
const pubFuncs = new Set([...bloque.matchAll(/^\s{2}([a-zA-Z_$][\w$]*),$/gm)].map(m => m[1]));
const pubVars = new Set([...bloque.matchAll(/^\s{2}([a-zA-Z_$][\w$]*):\s*\{\s*get:/gm)].map(m => m[1]));

// ── Lo que los handlers necesitan (mismo análisis que gen-globals.cjs, sin el bloque generado) ──
const limpio = main.slice(0, main.indexOf(START));
const reHandler = /\bon[a-z]+\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/gi;
const usadosCall = new Set();
const usadosBare = new Set();
for (const src of [html, limpio, ...otros]) {
  let m;
  while ((m = reHandler.exec(src))) {
    // Las interpolaciones ${…} NO se descartan (hay handlers construidos enteros por una) — mismo criterio
    // que gen-globals.cjs: publicar de más es inofensivo, de menos es fatal.
    const body = m[2]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""');
    const reIdent = /[a-zA-Z_$][\w$]*/g;
    let im;
    while ((im = reIdent.exec(body))) {
      const prev = body.slice(0, im.index).trimEnd().slice(-1);
      if (prev === '.') continue;
      const next = body.slice(im.index + im[0].length).trimStart()[0];
      (next === '(' ? usadosCall : usadosBare).add(im[0]);
    }
  }
}

const kind = new Map();
for (const m of limpio.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/gm))
  kind.set(m[1], 'function');
for (const m of limpio.matchAll(/^(?:export\s+)?(let|var|const)\s+([a-zA-Z_$][\w$]*)/gm))
  if (!kind.has(m[2])) kind.set(m[2], m[1]);
for (const m of limpio.matchAll(/^import\s*\{([^}]+)\}\s*from/gm))
  for (const n of m[1].split(',')) {
    const name = n.trim().split(/\s+as\s+/).pop().trim();
    if (name && !kind.has(name)) kind.set(name, 'import');
  }

const needFuncs = [...usadosCall].filter(
  n => kind.get(n) === 'function' || (kind.get(n) === 'import' && !usadosBare.has(n))
);
const needVars = [...new Set([...usadosBare, ...usadosCall])]
  .filter(n => ['let', 'var', 'const', 'import'].includes(kind.get(n)))
  .filter(n => !needFuncs.includes(n));

const faltanF = needFuncs.filter(n => !pubFuncs.has(n));
const faltanV = needVars.filter(n => !pubVars.has(n));
const sobran = [...pubFuncs, ...pubVars].filter(n => !kind.has(n)); // publicada pero ya no existe → ReferenceError

let bad = false;
if (faltanF.length) {
  bad = true;
  console.error(`❌ ${faltanF.length} función(es) que usan los handlers NO publicadas (botón muerto):`);
  console.error('   ' + faltanF.join(', '));
}
if (faltanV.length) {
  bad = true;
  console.error(
    `❌ ${faltanV.length} variable(s) de estado que usan los handlers NO publicadas (formulario ciego):`
  );
  console.error('   ' + faltanV.join(', '));
}
if (sobran.length) {
  bad = true;
  console.error(`❌ ${sobran.length} publicada(s) que ya NO existen (rompen el build): ${sobran.join(', ')}`);
}
if (bad) {
  console.error('   → corré: node scripts/gen-globals.cjs');
  process.exit(1);
}
console.log(
  `✅ globals: ${pubFuncs.size} funciones + ${pubVars.size} variables de estado publicadas — todos los handlers inline resuelven`
);
