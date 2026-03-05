export async function onRequestGet(context) {
  const { env } = context;
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  try {
    const cached = await env.COURSE_CACHE.get("courses_data", { type: "json" });

    if (!cached) {
      return new Response(JSON.stringify({
        courses: [],
        syncedAt: null,
        totalCount: 0,
        message: "데이터가 아직 동기화되지 않았습니다. 잠시 후 다시 시도해주세요."
      }), { headers });
    }

    return new Response(JSON.stringify({
      courses: cached.courses,
      syncedAt: cached.syncedAt,
      totalCount: cached.totalCount,
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
