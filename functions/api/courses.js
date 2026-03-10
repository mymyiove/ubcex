// functions/api/courses.js
// GET /api/courses — Worker chunk 데이터를 합쳐서 반환

export async function onRequestGet(context) {
  const { env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    let allCourses = [];
    let chunkIndex = 0;
    
    // Worker에서 chunk별로 데이터 가져오기
    while (true) {
      try {
        const chunkRes = await fetch(`https://udemy-sync.mymyiove882.workers.dev/get-courses?chunk=${chunkIndex}`, {
          headers: { 'Authorization': 'Bearer gogo1014' }
        });
        
        if (!chunkRes.ok) break;
        
        const chunkData = await chunkRes.json();
        if (!chunkData || chunkData.length === 0) break;
        
        allCourses = allCourses.concat(chunkData);
        chunkIndex++;
      } catch (e) {
        console.error(`Chunk ${chunkIndex} 로드 실패:`, e);
        break;
      }
    }

    // Worker 동기화 상태도 가져오기
    let syncedAt = null;
    try {
      const statusRes = await fetch(`https://udemy-sync.mymyiove882.workers.dev/status`, {
        headers: { 'Authorization': 'Bearer gogo1014' }
      });
      const statusData = await statusRes.json();
      syncedAt = statusData.syncedAt;
    } catch (e) {
      console.warn('Worker 상태 조회 실패:', e);
    }

    return new Response(
      JSON.stringify({
        courses: allCourses,
        syncedAt: syncedAt,
        totalCount: allCourses.length,
        chunksLoaded: chunkIndex,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
