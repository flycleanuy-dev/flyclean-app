const ALLOWED_ENDPOINTS = [
  /^databases\/[a-f0-9-]{32,36}\/query$/,
  /^databases\/[a-f0-9-]{32,36}$/,
  /^pages\/[a-f0-9-]{32,36}$/,
  /^pages$/,
  /^search$/,
];
const ALLOWED_METHODS = ['GET', 'POST', 'PATCH'];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://flyclean-app.vercel.app',
    /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/,
  ];
  const originAllowed = allowedOrigins.some(o =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );

  res.setHeader('Access-Control-Allow-Origin', originAllowed ? origin : 'https://flyclean-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN not configured' });

  const { endpoint, method = 'GET', body } = req.body || {};

  // Validate endpoint
  if (!endpoint || typeof endpoint !== 'string' || endpoint.length > 200) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }
  const endpointNorm = endpoint.trim().replace(/^\/+/, '');
  if (!ALLOWED_ENDPOINTS.some(re => re.test(endpointNorm))) {
    return res.status(400).json({ error: 'Endpoint not allowed' });
  }

  // Validate method
  const httpMethod = String(method).toUpperCase();
  if (!ALLOWED_METHODS.includes(httpMethod)) {
    return res.status(400).json({ error: 'HTTP method not allowed' });
  }

  const notionHeaders = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(`https://api.notion.com/v1/${endpointNorm}`, {
      method: httpMethod,
      headers: notionHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    // Fallback for Servicios DB (multiple data sources)
    if (data.code === 'validation_error' &&
        data.additional_data?.error_type === 'multiple_data_sources_for_database') {
      const dbId = endpointNorm.split('/')[1];
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
    return res.status(500).json({ error: 'Internal error' });
  }
}
