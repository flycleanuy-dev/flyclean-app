// Chequeo de sintaxis del JS del front (no hay build step que lo valide). Lo corre el CI en cada PR.
//
// Desde la extracción del 15/07 (modularización), el JS del front vive en /app.js y el index.html solo
// lo referencia (`<script src="/app.js">`). Este test:
//   1. verifica que app.js parsee;
//   2. verifica que index.html NO tenga JS inline suelto (si alguien vuelve a meter un <script> con código,
//      lo chequea igual — no queremos que el monolito vuelva por la ventana);
//   3. FALLA si index.html dejó de referenciar app.js (un extract a medias dejaría la app sin código).
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

// 3) La referencia tiene que estar (si no, la app carga sin JS y no lo notaría ningún otro test).
if (!/<script[^>]*\bsrc=["']\/app\.js["']/.test(html)) {
  console.error('❌ index.html no referencia /app.js — la app quedaría sin JavaScript.');
  process.exit(1);
}

// 1) app.js parsea.
try {
  new Function(appJs);
} catch (e) {
  console.error('❌ SYNTAX ERROR en app.js:', e.message);
  process.exit(1);
}

// 2) JS inline residual en index.html (debería ser 0, pero si aparece se valida igual).
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m,
  inline = '',
  n = 0;
while ((m = re.exec(html))) {
  if (!m[1].trim()) continue; // <script> vacío: ignorar
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

const kb = (appJs.length / 1024).toFixed(0);
console.log(
  `✅ app.js parsea (${appJs.split('\n').length} líneas, ${kb} KB) · index.html lo referencia OK` +
    (n ? ` · ${n} bloque(s) inline residual(es) OK` : ' · sin JS inline')
);
