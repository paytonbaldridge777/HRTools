export async function onRequest(context) {
  const { request, env } = context;
  const { FMLA_FAQ_KV } = env;

  if (!FMLA_FAQ_KV) {
    return new Response(
      JSON.stringify({ error: 'KV binding FMLA_FAQ_KV is missing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method === 'GET') {
    const data = await FMLA_FAQ_KV.get('faq.json');
    return new Response(data || JSON.stringify({ updatedAt: null, items: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    const sanitizedItems = items
      .map((item, index) => {
        const question = String(item.question || '').trim();
        const answer = String(item.answer || '').trim();
        if (!question && !answer) return null;

        let id = String(item.id || '').trim();
        if (!id) {
          id = question
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || `faq-${index + 1}`;
        }

        return { id, question, answer };
      })
      .filter(Boolean);

    const updatedFaq = {
      updatedAt: new Date().toISOString().split('T')[0],
      items: sanitizedItems
    };

    await FMLA_FAQ_KV.put('faq.json', JSON.stringify(updatedFaq, null, 2));

    return new Response(JSON.stringify(updatedFaq), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
