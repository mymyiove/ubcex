// ═══════════════════════════════════════════════════════════
// letter-list.js — 레터 목록 조회 API
// GET /api/letter-list
// GET /api/letter-list?status=published (필터)
// ═══════════════════════════════════════════════════════════
export async function onRequestGet(context) {
  var { request, env } = context;
  var url = new URL(request.url);
  var statusFilter = url.searchParams.get('status'); // draft | published | sent

  var headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=30'
  };

  var KV = env.COURSE_KV || env.KV;

  try {
    var indexRaw = await KV.get('letter_index');
    var index = indexRaw ? JSON.parse(indexRaw) : [];

    // 상태 필터
    if (statusFilter) {
      index = index.filter(function(item) {
        return item.status === statusFilter;
      });
    }

    return new Response(JSON.stringify({
      success: true,
      total: index.length,
      data: index
    }), { headers: headers });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: headers
    });
  }
}
