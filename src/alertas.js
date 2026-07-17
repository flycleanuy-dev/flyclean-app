// ─────────────────────────────────────────────
// ALERTAS — banner de avisos por rol (coord/CEO/operario/ventas): mantenimiento de equipos, check mensual,
// reporte semanal del piloto, servicios por gestionar, propuestas para re-contactar, clientes para
// mantenimiento (9m), pedidos de compra pendientes, documentos/certificados por vencer. Extraído de main.js
// el 2026-07-17 (patrón puente). Las informativas se descartan con × (localStorage por dismissKey); las
// críticas (≤7 días / vencido) SIEMPRE se muestran. Los onclick de las alertas son strings → resuelven por
// window (gen-globals los publica). Todo el estado propio (_alertsByContainer, dismissed) vive acá.
// ─────────────────────────────────────────────
import { t } from './i18n.js';
import { esc } from './util.js';
import { esArchivado } from './calculos.js';
import { callNotion, callDb } from './api.js';
import { eqProblemaAbierto } from './equipos.js';
import { pedidoPaisDelUser } from './pedidos.js';

let M = {};
export function initAlertas(bridge) { M = bridge; }

const esVentas = (...a) => M.esVentas(...a);
const cfgRegla = (...a) => M.cfgRegla(...a);
const getCountryFilter = (...a) => M.getCountryFilter(...a);
const getCEOFilter = (...a) => M.getCEOFilter(...a);
const computeClienteSecciones = (...a) => M.computeClienteSecciones(...a);
const fetchPropsYSvcsParaSecciones = (...a) => M.fetchPropsYSvcsParaSecciones(...a);

const _alertsByContainer = {};

function _alertsDismissedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('fc_alertsDismissed') || '[]')); }
  catch (e) { return new Set(); }
}
export function isAlertDismissed(key) {
  return _alertsDismissedSet().has(key);
}
export function dismissAlertKey(key) {
  const set = _alertsDismissedSet();
  set.add(key);
  try { localStorage.setItem('fc_alertsDismissed', JSON.stringify(Array.from(set))); } catch (e) {}
}
export function dismissAlert(containerId, key) {
  // Preservar si la lista estaba abierta: renderAlertsBanner reconstruye el banner con la
  // lista colapsada, así que sin esto tocar la × cerraba TODA la lista (regresión v114).
  const prevList = document.getElementById(containerId + '_list');
  const estabaAbierta = prevList && prevList.style.display !== 'none';
  dismissAlertKey(key);
  renderAlertsBanner(containerId, _alertsByContainer[containerId] || []);
  if (estabaAbierta) {
    const list = document.getElementById(containerId + '_list');
    const toggle = document.getElementById(containerId + '_list_toggle');
    if (list) list.style.display = 'block';
    if (toggle) toggle.textContent = t('alerts.close');
  }
}

export function renderAlertsBanner(containerId, alerts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  _alertsByContainer[containerId] = alerts;
  const visible = alerts.filter(a => !(a.dismissKey && isAlertDismissed(a.dismissKey) && a.level !== 'critical'));
  if (!visible.length) { el.innerHTML = ''; return; }
  const hasCritical = visible.some(a => a.level === 'critical');
  const id = containerId + '_list';
  const labelAlertas = visible.length > 1 ? t('alerts.alertas') : t('alerts.alerta');
  const labelActivas = visible.length > 1 ? t('alerts.activas') : t('alerts.activa');
  el.innerHTML =
    '<div class="alerts-banner">' +
      '<div class="alerts-header ' + (hasCritical ? 'critical' : '') + '" onclick="toggleAlertsList(\'' + id + '\', this)">' +
        '<div class="alerts-header-left">' +
          (hasCritical ? '🔴' : '⚠️') + ' ' + visible.length + ' ' + labelAlertas + ' ' + labelActivas +
        '</div>' +
        '<span class="alerts-toggle" id="' + id + '_toggle">' + t('alerts.see') + '</span>' +
      '</div>' +
      '<div class="alerts-list ' + (hasCritical ? 'critical' : '') + '" id="' + id + '" style="display:none">' +
        visible.map(a =>
          '<div class="alert-item"' + (a.onclick ? ' style="cursor:pointer" onclick="' + a.onclick.replace(/"/g, '&quot;') + '"' : '') + '><div class="alert-icon">' + a.icon + '</div><div>' + a.message + (a.onclick ? ' <span style="opacity:0.6">›</span>' : '') + '</div>' +
          (a.dismissKey ? '<span class="alert-dismiss" onclick="event.stopPropagation(); dismissAlert(\'' + containerId + '\',\'' + esc(a.dismissKey) + '\')">×</span>' : '') +
          '</div>'
        ).join('') +
      '</div>' +
    '</div>';
}

export function toggleAlertsList(id, header) {
  const list = document.getElementById(id);
  const toggle = document.getElementById(id + '_toggle');
  if (!list) return;
  const open = list.style.display === 'none';
  list.style.display = open ? 'block' : 'none';
  if (toggle) toggle.textContent = open ? t('alerts.close') : t('alerts.see');
}

export async function loadAlerts(role, bannerId) {
  if (!M.currentUser) { const el = document.getElementById(bannerId); if (el) el.innerHTML = ''; return; }
  // Ventas (apertura 2026-07-05): banner reducido — ve SOLO la alerta "propuestas para re-contactar"
  // (su trabajo de seguimiento). Equipos se saltea abajo con esVentasRol; el resto de bloques
  // (servicios/mantenimiento clientes/compras/documentos) ya excluyen a Ventas vía isCoord/isCEO.
  const esVentasRol = esVentas();
  const alerts = [];
  const today = new Date().toISOString().split('T')[0];
  const warnDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const isCoord = role === '🔧 Coordinador' || role === '🎯 Dirección';
  const isCEO = role === '👔 CEO';
  const isOperario = !isCoord && !isCEO;

  // Country filter for Activos — usa el mapa GLOBAL de 5 países (review v167: el local de 3 dejaba
  // a GT/MX viendo activos de todos los países y el conteo de la alerta no coincidía con la tab).
  const financeCountryMap = M.COUNTRY_FINANCE_MAP;
  const userCountry = M.currentUser.country;
  const actCountryVal = financeCountryMap[userCountry];
  const actFilter = actCountryVal ? { property: 'País', select: { equals: actCountryVal } } : null;

  // La alerta DGI hardcodeada se reemplazó por la query real a la base
  // 📑 Documentos & Certificados (más abajo, dentro del try).

  try {
    // Equipment maintenance alerts (all roles menos Ventas — no gestiona equipos)
    // v167: se traen TODOS los activos del país (sin filtro de fecha server) y se computan las DOS
    // alertas client-side: mantenimiento próximo/vencido + equipos SIN CHECK mensual. Cambio consciente:
    // "En reparación"/"En mantenimiento" ahora alertan SIEMPRE (antes solo si además tenían fecha próxima).
    const actData = esVentasRol ? { results: [] } : await callNotion(`databases/${M.ACTIVOS_DB_ID}/query`, 'POST', {
      ...(actFilter ? { filter: actFilter } : {})
    });
    let sinCheckN = 0;
    (actData.results || []).forEach(r => {
      const nombre = r.properties?.['Activo']?.title?.[0]?.plain_text || 'Equipo';
      const fecha = r.properties?.['Próximo mantenimiento']?.date?.start || '';
      const estado = r.properties?.['Estado']?.select?.name || '';
      // Check mensual: equipos activos sin check en 30 días (o nunca) — se agrupa en UNA alerta abajo.
      if (!estado.includes('Fuera de servicio')) {
        const uc = r.properties?.['Último check']?.date?.start || '';
        const dias = uc ? Math.floor((Date.now() - new Date(uc + (uc.length === 10 ? 'T00:00:00' : '')).getTime()) / 86400000) : null;
        if (dias == null || dias > 30) sinCheckN++;
      }
      if (estado === '🚨 En reparación') {
        alerts.push({ level: 'critical', icon: '🔴', message: nombre + ' — en reparación' });
      } else if (estado === '🔧 En mantenimiento') {
        alerts.push({ level: 'warn', icon: '🔧', message: nombre + ' — en mantenimiento' });
      } else if (fecha && fecha <= today) {
        alerts.push({ level: 'critical', icon: '🔴', message: nombre + ' — mantenimiento vencido desde ' + fecha });
      } else if (fecha && fecha <= warnDate) {
        const days = Math.round((new Date(fecha) - new Date()) / 86400000);
        alerts.push({ level: 'warn', icon: '⚠️', message: nombre + ' — mantenimiento en ' + days + ' días (' + fecha + ')' });
      }
      // Equipos v2 — problema reportado por el piloto (evento 'problema' abierto en el historial): avisa a
      // quien gestiona la flota (coord/CEO). esc() en el texto libre del piloto (defensa; el input ya rechaza <>).
      if ((isCoord || isCEO) && !estado.includes('Fuera de servicio')) {
        const prob = eqProblemaAbierto(r.properties || {});
        if (prob) {
          const clickable = (role.includes('Coordinador') || role.includes('Dirección'));
          alerts.push({ level: 'warn', icon: '⚠️', message: esc(nombre) + ' — ' + esc(prob.n || '') + ' · ' + t('eq.prob.byPiloto'),
            ...(clickable ? { onclick: "setCoordTab('equipos')" } : {}) });
        }
      }
    });
    if (sinCheckN > 0 && (isCoord || isCEO)) {
      // Tocable solo donde existe la tab (pantalla del coordinador; Dirección también la tiene).
      const clickable = (role.includes('Coordinador') || role.includes('Dirección'));
      alerts.push({ level: 'warn', icon: '🔧', message: t('eq.alert.sincheck').replace('{n}', sinCheckN),
        ...(clickable ? { onclick: "setCoordTab('equipos')" } : {}) });
    }

    // Equipos v2 — reporte SEMANAL del RESPONSABLE (operario/piloto): de viernes a domingo, si algún equipo
    // suyo no tiene reporte/check esta semana (desde el lunes), alerta tocable que abre "🔧 Mis equipos".
    if (isOperario && !esVentasRol) {
      const dow = new Date().getDay(); // 5=vie · 6=sáb · 0=dom
      if (dow === 5 || dow === 6 || dow === 0) {
        const lunes = new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000).toISOString().split('T')[0];
        const pendRep = (actData.results || []).filter(r => {
          const p = r.properties || {};
          if ((p['Responsable App']?.select?.name || '') !== (M.currentUser?.name || '')) return false;
          if ((p['Estado']?.select?.name || '').includes('Fuera de servicio')) return false;
          const uc = (p['Último check']?.date?.start || '').slice(0, 10);
          return !uc || uc < lunes;
        }).length;
        if (pendRep) alerts.push({ level: 'warn', icon: '🔧', message: t('miseq.alert').replace('{n}', pendRep), onclick: 'openMisEquipos()' });
      }
    }

    // Servicios pendientes por gestionar: en Pendiente/Asignado que les falta fecha U operario (coord + CEO).
    // OJO: el proxy descarta el filtro server-side de la base Servicios (multi-data-source) → hay que
    // re-filtrar SIEMPRE en el cliente (antes solo se filtraba por país → contaba TODOS los servicios).
    if (isCoord || isCEO) {
      const cf = isCoord ? getCountryFilter() : getCEOFilter();
      const svcData = await callNotion(`databases/${M.DB_ID}/query`, 'POST',
        { filter: { and: [ ...(cf ? [cf] : []), { property: 'Estado', select: { equals: '📋 Pendiente' } } ] } });
      const notionVal = M.COUNTRY_NOTION_MAP[isCoord ? M.selectedCountry : M.ceoViewCountry === 'all' ? null : M.ceoViewCountry];
      const EST_GESTION = ['📋 Pendiente', '🔄 Asignado'];
      const pend = (svcData.results || []).filter(s => {
        const est = s.properties?.['Estado']?.select?.name || '';
        if (!EST_GESTION.includes(est)) return false;            // excluye completados/cancelados/plantillas
        if (notionVal && s.properties?.['País']?.select?.name !== notionVal) return false;
        const sinOp = !s.properties?.['Operario App']?.select?.name;
        const sinFecha = !s.properties?.['Fecha programada']?.date?.start;
        return sinOp || sinFecha;                                 // "por gestionar" = le falta algo
      });
      if (pend.length) {
        const gestAlert = { level: 'warn', icon: '📋',
          message: pend.length + ' servicio' + (pend.length > 1 ? 's' : '') + ' pendiente' + (pend.length > 1 ? 's' : '') + ' por gestionar (falta fecha u operario)' };
        // Deep-link (auditoría 2026-07-09): tocar la alerta lleva a la lista de Servicios para gestionarlos.
        if (bannerId === 'alerts-banner-coord') gestAlert.onclick = "setCoordTab('servicios')";
        else if (bannerId === 'alerts-banner-ceo') gestAlert.onclick = "setCEOTab('servicios')";
        alerts.push(gestAlert);
      }

    }

    // Pipeline: propuestas para re-contactar (esperando respuesta del cliente, +15 días) — coord + CEO
    // + Ventas (2026-07-05: es SU alerta de trabajo; getCountryFilter la scopea a su país).
    if (isCoord || isCEO || esVentasRol) {
      const cf = isCEO ? getCEOFilter() : getCountryFilter();
      // Mismos estados "esperando respuesta" que usa el cron diario (api/cron-pipeline.js).
      const ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
      const propFilter = { and: [
        ...(cf ? [cf] : []),
        { or: ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) }
      ]};
      const propData = await callNotion(`databases/${M.PROPUESTAS_DB_ID}/query`, 'POST', { filter: propFilter });
      const hoyISOProp = new Date().toISOString().split('T')[0];
      const vencidas = (propData.results || []).filter(r => {
        const dias = r.properties?.['Días sin respuesta']?.formula?.number;
        // Snooze por registro (mismo criterio que "A contactar hoy" y el cron): pospuesta = no cuenta.
        const posp = (r.properties?.['Posponer aviso hasta']?.date?.start || '').split('T')[0];
        if (posp && posp > hoyISOProp) return false;
        return dias != null && dias >= cfgRegla('pipelineAviso');
      });
      if (vencidas.length) {
        const max = Math.max(...vencidas.map(r => r.properties?.['Días sin respuesta']?.formula?.number || 0));
        const propAlert = { level: max >= 45 ? 'critical' : 'warn', icon: '📞', message: vencidas.length + ' propuesta' + (vencidas.length > 1 ? 's' : '') + ' para re-contactar (máx ' + max + ' días sin respuesta)' };
        // Tocable SOLO en el banner del coord: lleva a la tab Propuestas y scrollea al bloque
        // "📞 A contactar hoy" (id coord-contactar-block). En CEO/operario queda informativa (sin acción).
        if (bannerId === 'alerts-banner-coord') {
          propAlert.onclick = "setCoordTab('propuestas'); setTimeout(function(){ if (typeof openContactarHoy === 'function') openContactarHoy(); var el = document.getElementById('coord-contactar-block'); if (el) el.scrollIntoView({behavior:'smooth'}); }, 600)";
        }
        alerts.push(propAlert);
      }
    }

    // Clientes para ofrecer mantenimiento (9+ meses sin trabajo, spec 2026-07-02) — coord + CEO + Ventas.
    // Reusa el mismo cruce clientes×propuestas×servicios de la tab Clientes (computeClienteSecciones);
    // fetch propio (no depende de que la tab Clientes ya haya cargado _coordAllContacts). Ventas la ve
    // (2026-07-06): es su lista de clientes para recontactar (país-scoped, deep-link a la tab Clientes).
    if (isCoord || isCEO || esVentasRol) {
      // Try/catch propio: es una alerta informativa, nunca debe tumbar las que vienen después
      // (Solicitud de compras, Documentos) si algo de este cruce falla.
      try {
        const { propuestas, servicios } = await fetchPropsYSvcsParaSecciones();
        if (propuestas && servicios) {
          const notionQuery = () => callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', {});
          let contactos;
          try { contactos = (await callDb('clientes')).results || []; } catch (e) { contactos = (await notionQuery()).results || []; }
          contactos = (contactos || []).filter(c => !esArchivado(c));
          const secciones = computeClienteSecciones(contactos, propuestas, servicios);
          if (secciones && secciones.mantenimiento.length) {
            const cf = isCEO ? getCEOFilter() : getCountryFilter();
            const notionVal = cf?.select?.equals || null;
            const mant = notionVal ? secciones.mantenimiento.filter(c => (c.properties?.['País']?.select?.name || '') === notionVal) : secciones.mantenimiento;
            if (mant.length) {
              const mantAlert = { level: 'warn', icon: '🔁', message: mant.length + ' cliente' + (mant.length > 1 ? 's' : '') + ' para ofrecer mantenimiento (9+ meses del último trabajo)' };
              // Tocable SOLO en el banner del coord: lleva a la tab Clientes y scrollea al bloque
              // "🔁 Mantenimiento" (id clientes-mantenimiento-block). En CEO queda informativa (sin acción).
              if (bannerId === 'alerts-banner-coord') {
                mantAlert.onclick = "setCoordTab('contactos'); setTimeout(function(){ var el = document.getElementById('clientes-mantenimiento-block'); if (el) el.scrollIntoView({behavior:'smooth'}); }, 600)";
              }
              alerts.push(mantAlert);
            }
          }
        }
      } catch (e) { /* alerta no crítica — fail silently */ }
    }

    // Solicitud de compras: pedidos pendientes del país del coord (coord only)
    if (isCoord) {
      const pedData = await callNotion(`databases/${M.SOLICITUDES_DB_ID}/query`, 'POST', { page_size: 100 });
      let pedidos = (pedData.results || []).filter(r => (r.properties?.['Estado']?.select?.name || '').includes('Pendiente'));
      const isGlobal = M.currentUser?.role?.includes('Dirección');
      if (!isGlobal) {
        const paisUser = pedidoPaisDelUser();
        pedidos = pedidos.filter(r => (r.properties?.['País']?.select?.name || '') === paisUser);
      }
      if (pedidos.length) {
        const urgentes = pedidos.filter(r => (r.properties?.['Prioridad']?.select?.name || '').includes('Urgente')).length;
        let msg = pedidos.length + ' pedido' + (pedidos.length > 1 ? 's' : '') + ' pendiente' + (pedidos.length > 1 ? 's' : '');
        if (urgentes) msg += ' (' + urgentes + ' urgente' + (urgentes > 1 ? 's' : '') + ')';
        alerts.push({ level: urgentes ? 'critical' : 'warn', icon: '📦', message: msg, onclick: "setCoordTab('pedidos')" });
      }
    }

    // Documentos & Certificados por vencer (coord + CEO) — base 📑 Documentos & Certificados.
    // Cada documento define su antelación en "Días de aviso" (ej. DGI 60, BPS 15). El histórico no avisa.
    if (isCoord || isCEO) {
      const docData = await callNotion(`databases/${M.DOCUMENTOS_DB_ID}/query`, 'POST', { page_size: 100 });
      const isGlobalDoc = role === '🎯 Dirección';
      const paisDoc = financeCountryMap[userCountry]; // '🇺🇾 UY' / '🇧🇷 BR' / '🇵🇦 PA'
      (docData.results || []).forEach(r => {
        const p = r.properties || {};
        const estado = p['Estado']?.select?.name || '';
        // Solo documentos activos: vigentes / por vencer / vencidos sin reemplazar. El histórico se ignora.
        if (!(estado.includes('Vigente') || estado.includes('Por vencer') || estado.includes('Vencido'))) return;
        if (!isGlobalDoc && paisDoc) {
          const pais = p['País']?.select?.name || '';
          if (pais && pais !== paisDoc) return;
        }
        const vence = p['Vence']?.date?.start || '';
        if (!vence) return;
        const aviso = p['Días de aviso']?.number;
        const umbral = (aviso != null) ? aviso : 30;
        const daysLeft = Math.round((new Date(vence) - new Date()) / 86400000);
        if (daysLeft > umbral) return; // todavía dentro de su ventana sana
        const nombre = p['Documento']?.title?.[0]?.plain_text || 'Documento';
        const dismissKey = 'doc:' + r.id + ':' + vence;
        if (daysLeft < 0) {
          alerts.push({ level: 'critical', icon: '🔴', message: nombre + ' VENCIDO (venció ' + vence + ')', dismissKey });
        } else {
          alerts.push({ level: daysLeft <= 7 ? 'critical' : 'warn', icon: '📑', message: nombre + ' vence en ' + daysLeft + ' día' + (daysLeft === 1 ? '' : 's') + ' (' + vence + ')', dismissKey });
        }
      });
    }
  } catch (e) {
    // Fail silently — alerts are non-critical
  }

  renderAlertsBanner(bannerId, alerts);
}
