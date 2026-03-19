export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const chunk = url.searchParams.get('chunk') || '0';
  const action = url.searchParams.get('action') || 'get';

  const WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
  const WORKER_SECRET = 'gogo1014';

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  };

  try {
    if (action === 'status') {
      const res = await fetch(WORKER_URL + '/status', {
        headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    const res = await fetch(WORKER_URL + '/get-courses?chunk=' + chunk, {
      headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
    });

    if (!res.ok) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify([]), { headers: corsHeaders });
  }
}
