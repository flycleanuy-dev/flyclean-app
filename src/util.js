// ─────────────────────────────────────────────
// UTILIDADES PURAS (sin estado de módulo, sin DOM salvo escape de strings)
// ─────────────────────────────────────────────
// Hojas del árbol de dependencias: no importan nada de la app, así que cualquier
// módulo puede importarlas sin riesgo de import circular. Extraídas de main.js el 16/07.

// Escapa texto para insertarlo en HTML (previene XSS al pintar datos de Notion).
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Normaliza a array: filtra vacíos si ya es array; envuelve un valor suelto; [] si es falsy.
export function toArr(v) {
  return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
}

// Lee una property Notion multi_select devolviendo los nombres. Fallback a select (registros legacy que
// quedaron como single antes de la conversión a multi_select).
export function msNames(prop) {
  if (prop?.multi_select) return prop.multi_select.map(o => o.name).filter(Boolean);
  if (prop?.select?.name) return [prop.select.name];
  return [];
}

// Helper semver simple para comparar "x.y.z" (devuelve <0, 0, >0).
export function compareVersions(a, b) {
  const pa = String(a || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}
