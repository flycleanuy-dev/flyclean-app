// ─────────────────────────────────────────────
// ERRORES — captura global de errores JS y reporte automático a /api/reporte (Fase A del sistema de
// Soporte, 2026-07-17). Escucha window.onerror + unhandledrejection, drena la cola del mini-catcher
// inline de index.html (window.__fcErrQ, que atrapa incluso fallos de carga del bundle) y manda cada
// error UNA vez por sesión con contexto (versión, usuario, pantalla, tab). Muestra un toast discreto
// con la opción de agregar "qué estabas haciendo" (prompt simple → tipo 'detalle').
// ─────────────────────────────────────────────
// REGLA DE ORO: este módulo NO puede romper la app ni generar recursión — todo envuelto en try/catch,
// los fallos del propio POST no se re-reportan, y hay tope de 10 envíos por sesión.
import { t } from './i18n.js';

let M = {};
export function initErrores(bridge) {
  M = bridge;
  try {
    window.addEventListener('error', e => {
      // e.error puede ser null (errores de recurso/script cross-origin) → cae al message pelado.
      // Forense (post reporte #5): SIEMPRE anexar filename:lineno:col cuando exista — es la diferencia
      // entre saber QUÉ archivo falló (¿bundle? ¿script externo? ¿sw sirviendo corrupto?) y adivinar.
      const st = e?.error?.stack || '';
      const loc = e?.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno || 0}` : '';
      capturarError(e?.message || 'error', st + loc);
    });
    window.addEventListener('unhandledrejection', e => {
      const r = e?.reason;
      capturarError(r?.message || String(r || 'promesa rechazada'), r?.stack || '');
    });
    // Drenar lo que el mini-catcher inline juntó antes de que cargara el bundle.
    const q = Array.isArray(window.__fcErrQ) ? window.__fcErrQ.splice(0) : [];
    // A partir de acá el inline delega en nosotros (evita doble captura).
    window.__fcErrHooked = true;
    for (const it of q) capturarError(it && it.m, it && it.s);
  } catch (_) { /* el reporter jamás rompe la app */ }
}

const _enviados = new Set(); // mensajes ya reportados esta sesión (dedup cliente)
let _restantes = 10;         // tope de envíos por sesión (anti-tormenta)
let _ultimoHash = null;      // para enlazar el "detalle" humano con el último error

function capturarError(mensaje, stack) {
  try {
    const msg = String(mensaje || '').slice(0, 500).trim();
    if (!msg) return;
    if (msg.includes('/api/reporte')) return;      // sin recursión: fallos del propio reporter
    if (_enviados.has(msg) || _restantes <= 0) return;
    _enviados.add(msg);
    _restantes--;
    enviarReporte({ tipo: 'auto', mensaje: msg, stack: String(stack || '').slice(0, 2000) });
    mostrarToast();
  } catch (_) { /* nunca romper */ }
}

function contexto() {
  const ctx = { version: '', pantalla: '', tab: '', ua: navigator.userAgent, online: navigator.onLine };
  try { ctx.version = M.APP_VERSION || ''; } catch (_) {}
  try { ctx.pantalla = M._activeScreenId ? M._activeScreenId() : ''; } catch (_) {}
  try { ctx.tab = M.activeCoordTab || ''; } catch (_) {}
  return ctx;
}

function enviarReporte(datos) {
  try {
    const token = localStorage.getItem('fc_token') || '';
    fetch('/api/reporte', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({ ...contexto(), ...datos }),
      keepalive: true, // que salga aunque la pantalla esté por morir
    }).then(r => r.json()).then(d => { if (d && d.hash) _ultimoHash = d.hash; }).catch(() => {});
  } catch (_) { /* sin red / sin fetch → se descarta (v1) */ }
}

// Toast discreto abajo: avisa que el error se reportó solo + botón para contar qué estaba haciendo.
let _toastEl = null;
function mostrarToast() {
  try {
    if (_toastEl) return; // uno a la vez
    const d = document.createElement('div');
    d.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:18px;z-index:99999;background:#1a2620;color:#e8f0ec;' +
      'border:1px solid #2e4a3d;border-left:4px solid #e0a030;border-radius:12px;padding:12px 14px;' +
      'font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.45);display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    const txt = document.createElement('span');
    txt.textContent = '⚠️ ' + (t('err.toast') || 'Se detectó un error y se reportó automáticamente.');
    const btn = document.createElement('button');
    btn.textContent = t('err.btn') || 'Contar qué estabas haciendo';
    btn.style.cssText =
      'background:none;border:1px solid #00C98D;color:#00C98D;border-radius:8px;padding:6px 10px;' +
      'font-size:12px;font-weight:600;cursor:pointer';
    btn.onclick = () => {
      try {
        const det = prompt(t('err.prompt') || '¿Qué estabas haciendo cuando pasó? (opcional)');
        if (det && det.trim()) {
          enviarReporte({ tipo: 'detalle', mensaje: 'Detalle del equipo' + (_ultimoHash ? ' · err ' + _ultimoHash : ''), detalle: det.trim().slice(0, 1000) });
          txt.textContent = '✓ ' + (t('err.gracias') || 'Gracias, enviado.');
          btn.remove();
          setTimeout(cerrarToast, 2500);
        }
      } catch (_) {}
    };
    const x = document.createElement('span');
    x.textContent = '×';
    x.style.cssText = 'margin-left:auto;cursor:pointer;color:#6f8a80;font-size:18px;padding:0 4px';
    x.onclick = cerrarToast;
    d.appendChild(txt); d.appendChild(btn); d.appendChild(x);
    document.body.appendChild(d);
    _toastEl = d;
    setTimeout(cerrarToast, 15000); // se va solo
  } catch (_) {}
}
function cerrarToast() {
  try { if (_toastEl) { _toastEl.remove(); _toastEl = null; } } catch (_) {}
}
