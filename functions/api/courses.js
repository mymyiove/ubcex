// functions/api/courses.js
// Worker 상태만 반환 — chunk 로딩은 프론트엔드에서 직접

export async function onRequestGet(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // Worker 상태만 가져오기 (가벼운 요청 1번)
    const statusRes = await fetch("https://udemy-sync.mymyiove882.workers.dev/status", {
      headers: { "Authorization": "Bearer gogo1014" },
    });

    if (!statusRes.ok) {
      return new Response(
        JSON.stringify({ 
          workerUrl: "https://udemy-sync.mymyiove882.workers.dev",
          workerSecret: "gogo1014",
          totalChunks: 0,
          error: "Worker 연결 실패" 
        }),
        { headers: corsHeaders }
      );
    }

    const status = await statusRes.json();

    return new Response(
      JSON.stringify({
        workerUrl: "https://udemy-sync.mymyiove882.workers.dev",
        workerSecret: "gogo1014",
        totalChunks: status.totalChunks || 0,
        totalCount: status.totalCount || 0,
        syncedAt: status.syncedAt || status.lastSyncedAt || null,
        isComplete: status.isComplete || false,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ 
        workerUrl: "https://udemy-sync.mymyiove882.workers.dev",
        workerSecret: "gogo1014",
        totalChunks: 0,
        error: err.message 
      }),
      { headers: corsHeaders }
    );
  }
}
