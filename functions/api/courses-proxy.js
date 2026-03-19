export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const chunk = url.searchParams.get('chunk') || '0';
  const action = url.searchParams.get('action') || 'get';
  const ids = url.searchParams.get('ids') || '';

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

    // New: fetch only specific IDs
    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      if (idList.length === 0) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
      }

      // Get status first
      const statusRes = await fetch(WORKER_URL + '/status', {
        headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
      });
      const status = await statusRes.json();
      const tc = status.totalChunks || 0;

      // Fetch all chunks in parallel
      const promises = [];
      for (let i = 0; i < tc; i++) {
        promises.push(
          fetch(WORKER_URL + '/get-courses?chunk=' + i, {
            headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        );
      }
      const results = await Promise.all(promises);

      // Find only requested IDs
      const found = [];
      const idSet = new Set(idList);
      for (let i = 0; i < results.length; i++) {
        if (!Array.isArray(results[i])) continue;
        for (let j = 0; j < results[i].length; j++) {
          if (idSet.has(String(results[i][j].id))) {
            found.push(results[i][j]);
            idSet.delete(String(results[i][j].id));
            if (idSet.size === 0) break;
          }
        }
        if (idSet.size === 0) break;
      }

      return new Response(JSON.stringify(found), { headers: corsHeaders });
    }

    // Default: fetch chunk
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
