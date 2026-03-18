// ═══════════════════════════════════════════════════════════
// letter-get.js — 레터 데이터 조회 API
// GET /api/letter-get?month=2026-03
// ═══════════════════════════════════════════════════════════
export async function onRequestGet(context) {
  var { request, env } = context;
  var url = new URL(request.url);
  var month = url.searchParams.get('month');

  var headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60'
  };

  var KV = env.COURSE_CACHE;

  // month 없으면 최신호 반환
  if (!month) {
    var indexRaw = await KV.get('letter_index');
    var index = indexRaw ? JSON.parse(indexRaw) : [];

    if (index.length === 0) {
      return new Response(JSON.stringify({ success: false, error: '레터가 없습니다' }), {
        status: 404, headers: headers
      });
    }

    // 최신 published 레터 찾기
    var latest = null;
    for (var i = 0; i < index.length; i++) {
      if (index[i].status === 'published' || index[i].status === 'sent') {
        latest = index[i];
        break;
      }
    }
    // published 없으면 그냥 최신
    if (!latest) latest = index[0];
    month = latest.month;
  }

  try {
    var raw = await KV.get('letter_' + month);
    if (!raw) {
      return new Response(JSON.stringify({ success: false, error: month + '호를 찾을 수 없습니다' }), {
        status: 404, headers: headers
      });
    }

    var data = JSON.parse(raw);

    return new Response(JSON.stringify({
      success: true,
      data: data
    }), { headers: headers });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: headers
    });
  }
}
