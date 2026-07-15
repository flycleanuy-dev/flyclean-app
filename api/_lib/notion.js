// Helpers server-side para hablar con Notion directo (usados por los crons).
// Usa NOTION_TOKEN del entorno. Mismas convenciones que api/notion.js.
const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function headers() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN no configurado');
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// Query con paginación. Devuelve TODAS las páginas.
// Fallback automático para DBs con múltiples data sources (ej. Servicios):
// si Notion responde multiple_data_sources_for_database, cae al search API y
// filtra por parent database id (igual que api/notion.js). OJO: en ese caso el
// `filter` server-side NO aplica → hay que filtrar client-side.
export async function queryAll(databaseId, body = {}) {
  let results = [],
    cursor;
  do {
    const r = await fetch(`${NOTION_BASE}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    const d = await r.json();
    if (!r.ok) {
      if (
        d.code === 'validation_error' &&
        d.additional_data?.error_type === 'multiple_data_sources_for_database'
      ) {
        return searchByParent(databaseId);
      }
      throw new Error(`Notion query ${databaseId}: ${d.message || r.status}`);
    }
    results = results.concat(d.results || []);
    cursor = d.has_more ? d.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function searchByParent(dbId) {
  const norm = s => (s || '').replace(/-/g, '');
  const target = norm(dbId);
  let all = [],
    cursor;
  do {
    const r = await fetch(`${NOTION_BASE}/search`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`Notion search: ${d.message || r.status}`);
    all = all.concat((d.results || []).filter(p => norm(p.parent?.database_id) === target));
    cursor = d.has_more ? d.next_cursor : undefined;
  } while (cursor && all.length < 2000);
  return all;
}

export async function updatePage(pageId, properties) {
  const r = await fetch(`${NOTION_BASE}/pages/${pageId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Notion update ${pageId}: ${d.message || r.status}`);
  return d;
}
