export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN no configurado en Vercel' });

  const { endpoint, method = 'GET', body } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });

  const notionHeaders = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      method,
      headers: notionHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    // Fallback: si la DB tiene múltiples fuentes, usar search API
    if (data.code === 'validation_error' &&
        data.additional_data?.error_type === 'multiple_data_sources_for_database') {
      const dbId = endpoint.split('/')[1];
      let allResults = [];
      let cursor = null;

      do {
        const searchBody = { filter: { property: 'object', value: 'page' }, page_size: 100 };
        if (cursor) searchBody.start_cursor = cursor;

        const sr = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: notionHeaders,
          body: JSON.stringify(searchBody),
        });
        const sd = await sr.json();
        const filtered = (sd.results || []).filter(r => r.parent?.database_id === dbId);
        allResults = allResults.concat(filtered);
        cursor = sd.has_more ? sd.next_cursor : null;
      } while (cursor && allResults.length < 500);

      return res.status(200).json({ object: 'list', results: allResults, has_more: false });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
