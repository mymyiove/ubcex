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
    // ── 상태 조회 ──
    if (action === 'status') {
      const res = await fetch(WORKER_URL + '/status', {
        headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // ── ID로 강의 검색 (배치 방식) ──
    if (ids) {
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      if (idList.length === 0) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
      }

      const statusRes = await fetch(WORKER_URL + '/status', {
        headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
      });
      const status = await statusRes.json();
      const tc = status.totalChunks || 0;

      const BATCH_SIZE = 3;
      const found = [];
      const idSet = new Set(idList);

      for (let batchStart = 0; batchStart < tc && idSet.size > 0; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, tc);
        const batchPromises = [];

        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(
            fetch(WORKER_URL + '/get-courses?chunk=' + i, {
              headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
            }).then(r => r.ok ? r.json() : []).catch(() => [])
          );
        }

        const results = await Promise.all(batchPromises);

        for (const courses of results) {
          if (!Array.isArray(courses)) continue;
          for (const course of courses) {
            if (idSet.has(String(course.id))) {
              found.push(course);
              idSet.delete(String(course.id));
              if (idSet.size === 0) break;
            }
          }
          if (idSet.size === 0) break;
        }
      }

      return new Response(JSON.stringify(found), { headers: corsHeaders });
    }

    // ── 청크 데이터 조회 ──
    const res = await fetch(WORKER_URL + '/get-courses?chunk=' + chunk, {
      headers: { 'Authorization': 'Bearer ' + WORKER_SECRET }
    });
    if (!res.ok) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, courses: [] }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
