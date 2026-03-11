export async function onRequestGet(context) {
  const { env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const workerUrl = env.WORKER_URL || "https://udemy-sync.mymyiove882.workers.dev";
    const workerSecret = env.WORKER_SECRET || "gogo1014";

    let allCourses = [];
    let chunkIndex = 0;
    let loadedChunks = 0;

    while (true) {
      try {
        const chunkRes = await fetch(`${workerUrl}/get-courses?chunk=${chunkIndex}`, {
          headers: { "Authorization": `Bearer ${workerSecret}` },
        });

        if (!chunkRes.ok) {
          if (chunkIndex === 0) {
            return new Response(
              JSON.stringify({
                courses: [],
                totalCount: 0,
                error: `Worker 응답 오류: ${chunkRes.status}`,
                message: "데이터가 아직 동기화되지 않았습니다. Worker에서 /sync를 먼저 실행해주세요.",
              }),
              { headers: corsHeaders }
            );
          }
          break;
        }

        const chunkData = await chunkRes.json();

        if (!chunkData || !Array.isArray(chunkData) || chunkData.length === 0) {
          break;
        }

        allCourses = allCourses.concat(chunkData);
        loadedChunks++;
        chunkIndex++;

        if (chunkIndex >= 50) break;
      } catch (e) {
        console.error(`Chunk ${chunkIndex} 로드 실패:`, e.message);
        if (chunkIndex === 0) {
          return new Response(
            JSON.stringify({
              courses: [],
              totalCount: 0,
              error: e.message,
              message: "Worker 연결 실패",
            }),
            { headers: corsHeaders }
          );
        }
        break;
      }
    }

    let syncedAt = null;
    try {
      const statusRes = await fetch(`${workerUrl}/status`, {
        headers: { "Authorization": `Bearer ${workerSecret}` },
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        syncedAt = statusData.syncedAt || statusData.lastSyncedAt;
      }
    } catch (e) {
      console.warn("Worker 상태 조회 실패:", e.message);
    }

    return new Response(
      JSON.stringify({
        courses: allCourses,
        syncedAt: syncedAt,
        totalCount: allCourses.length,
        chunksLoaded: loadedChunks,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        courses: [],
        totalCount: 0,
        error: err.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}
