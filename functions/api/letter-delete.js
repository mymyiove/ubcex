// ═══════════════════════════════════════════════════════════
// letter-delete.js — 레터 삭제 API
// POST /api/letter-delete
// body: { month: "2026-03" }
// ═══════════════════════════════════════════════════════════
export async function onRequestPost(context) {
  var { request, env } = context;
  var ADMIN_SECRET = 'gogo1014';

  var auth = request.headers.get('Authorization');
  if (!auth || auth !== 'Bearer ' + ADMIN_SECRET) {
    return new Response(JSON.stringify({ success: false, error: '인증 실패' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    var body = await request.json();
    var month = body.month;

    if (!month) {
      return new Response(JSON.stringify({ success: false, error: 'month 필수' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var KV = env.COURSE_KV || env.KV;

    // 레터 데이터 삭제
    await KV.delete('letter_' + month);

    // 인덱스에서 제거
    var indexRaw = await KV.get('letter_index');
    var index = indexRaw ? JSON.parse(indexRaw) : [];
    index = index.filter(function(item) { return item.month !== month; });
    await KV.put('letter_index', JSON.stringify(index));

    return new Response(JSON.stringify({
      success: true,
      message: month + '호 삭제 완료'
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
