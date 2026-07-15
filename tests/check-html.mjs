// Chequeo de sintaxis del JS embebido en index.html (no hay build step que lo valide).
// Extrae todos los <script> sin `src` y verifica que parseen. Lo corre el CI en cada PR.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m,
  all = '',
  n = 0;
while ((m = re.exec(html))) {
  all += '\n;{\n' + m[1] + '\n};\n';
  n++;
}

try {
  new Function(all); // lanza SyntaxError si algún bloque no parsea
} catch (e) {
  console.error('❌ SYNTAX ERROR en el JS embebido de index.html:', e.message);
  process.exit(1);
}
console.log(`✅ index.html: ${n} bloque(s) <script> parsean OK`);
