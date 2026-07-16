// ── 🤖 ASISTENTE IA (bot de ayuda "cómo usar la app") ────────────────────────
// Solo texto: manda la pregunta a /api/ayuda-bot (que fija el rol desde la sesión y responde según el manual
// de ESE rol). El bot no ejecuta nada ni ve datos → no puede romper la app. Historial en memoria de sesión.
// Extraído de main.js el 2026-07-16 (modularización).
//
// Dependencias de main.js resueltas por INYECCIÓN (initAyudaBot), no por import → sin ciclo hacia main:
//   · getUser()  → quién es el usuario logueado (el FAB solo aparece con sesión). Es un getter lazy
//                  porque currentUser muta en main.js; se lee en cada updateAyudaFab().
//   · onRelogin() → qué hacer ante un 401 (forceRelogin de main.js). Default no-op.
// t() sí se importa (i18n.js es una hoja, no crea ciclo).

import { t } from './i18n.js';

let _getUser = () => null;
let _onRelogin = () => {};

// main.js llama esto una vez al arrancar: initAyudaBot({ getUser: () => currentUser, onRelogin: forceRelogin }).
export function initAyudaBot({ getUser, onRelogin } = {}) {
  if (getUser) _getUser = getUser;
  if (onRelogin) _onRelogin = onRelogin;
}

const AYUDA_FAB_SCREENS = ['services', 'coordinator', 'ceo', 'finanzas']; // paneles de rol (cubre los 6 roles)
let _ayudaHist = [];
let _ayudaBusy = false;

export function updateAyudaFab() {
  const fab = document.getElementById('ayuda-fab');
  if (!fab) return;
  const scr = ((document.querySelector('.screen.active') || {}).id || '').replace('screen-', '');
  fab.style.display = (_getUser() && AYUDA_FAB_SCREENS.includes(scr)) ? 'flex' : 'none';
}
export function ayudaOverlayClick(e) { if (e.target.id === 'ayuda-overlay') closeAyudaBot(); }
export function closeAyudaBot() { document.getElementById('ayuda-overlay').classList.remove('open'); }
// Borra la conversación (memoria + burbujas + input) y cierra el panel. La app es una SPA: al cerrar sesión
// NO se recarga la página, así que sin esto el chat del usuario anterior seguía visible para el siguiente
// (bug reportado 2026-07-15: el chat del CEO aparecía en el coordinador). El chat pertenece a la sesión.
export function resetAyudaBot() {
  _ayudaHist = [];
  _ayudaBusy = false;
  const box = document.getElementById('ayuda-msgs');
  if (box) box.innerHTML = '';
  const inp = document.getElementById('ayuda-input');
  if (inp) inp.value = '';
  closeAyudaBot();
}
export function openAyudaBot() {
  const ov = document.getElementById('ayuda-overlay');
  if (!ov) return;
  ov.classList.add('open');
  if (!_ayudaHist.length && !document.querySelector('#ayuda-msgs .ayuda-bubble')) ayudaAddBubble('bot', t('ayuda.welcome'));
  setTimeout(() => { const i = document.getElementById('ayuda-input'); if (i) i.focus(); }, 100);
}
function ayudaAddBubble(cls, text) {
  const box = document.getElementById('ayuda-msgs');
  if (!box) return null;
  const d = document.createElement('div');
  d.className = 'ayuda-bubble ' + cls;
  d.textContent = text; // textContent → la respuesta del bot nunca se interpreta como HTML
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
  return d;
}
export async function sendAyuda() {
  if (_ayudaBusy) return;
  const input = document.getElementById('ayuda-input');
  const q = ((input && input.value) || '').trim();
  if (!q) return;
  input.value = '';
  ayudaAddBubble('me', q);
  _ayudaBusy = true;
  const sendBtn = document.getElementById('ayuda-send');
  if (sendBtn) sendBtn.disabled = true;
  const typing = ayudaAddBubble('bot', t('ayuda.typing'));
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const resp = await fetch('/api/ayuda-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ pregunta: q, historial: _ayudaHist.slice(-6) }),
    });
    if (typing) typing.remove();
    if (resp.status === 401) { closeAyudaBot(); _onRelogin(); return; }
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) { ayudaAddBubble('err', data.error || t('ayuda.error')); return; }
    const r = String(data.respuesta || '').trim() || t('ayuda.error');
    ayudaAddBubble('bot', r);
    _ayudaHist.push({ role: 'user', content: q }, { role: 'assistant', content: r });
    if (_ayudaHist.length > 12) _ayudaHist = _ayudaHist.slice(-12);
  } catch (_) {
    if (typing) typing.remove();
    ayudaAddBubble('err', t('ayuda.error'));
  } finally {
    _ayudaBusy = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}
