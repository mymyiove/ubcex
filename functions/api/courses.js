// functions/api/courses.js
// ============================================================
// Udemy Course API Proxy for Cloudflare Pages
// ============================================================
// 역할:
// - 프론트는 /api/courses 만 호출
// - 이 파일이 Worker에 Authorization을 붙여서 대신 호출
// - WORKER_SECRET은 절대 브라우저로 내려주지 않음
// ============================================================

const DEFAULT_WORKER_URL = "https://udemy-sync.mymyiove882.workers.dev";

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const workerUrl = String(env.WORKER_URL || DEFAULT_WORKER_URL).replace(/\/+$/, "");
  const workerSecret = String(env.WORKER_SECRET || "").trim();

  if (!workerSecret) {
    return jsonResponse(
      {
        success: false,
        error: "WORKER_SECRET 환경변수 누락",
        guide: "Cloudflare Pages 프로젝트 Settings > Environment variables 에 WORKER_SECRET을 추가하세요.",
      },
      500
    );
  }

  try {
    const endpoint = resolveEndpoint(url);
    const upstreamUrl = buildWorkerUrl(workerUrl, endpoint, url.searchParams);

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${workerSecret}`,
        "Content-Type": "application/json",
      },
    });

    const text = await upstreamRes.text();

    if (!upstreamRes.ok) {
      return jsonResponse(
        {
          success: false,
          error: "Worker 호출 실패",
          status: upstreamRes.status,
          endpoint,
          detail: safeParseJson(text) || text,
        },
        upstreamRes.status
      );
    }

    const parsed = safeParseJson(text);

    if (endpoint === "/status") {
      const status = parsed || {};

      return jsonResponse(
        {
          success: true,
          mode: "proxy",
          apiBase: "/api/courses",
          totalChunks: status.totalChunks || 0,
          totalCount: status.totalCount || 0,
          syncedAt: status.syncedAt || status.lastSyncedAt || null,
          isComplete: !!status.isComplete,
          status,
        },
        200
      );
    }

    if (parsed !== null) {
      return jsonResponse(parsed, 200);
    }

    return new Response(text, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        error: err.message || "Unknown proxy error",
      },
      500
    );
  }
}

function resolveEndpoint(url) {
  const endpoint = url.searchParams.get("endpoint");
  const path = url.searchParams.get("path");

  if (endpoint) {
    if (endpoint.startsWith("/")) return normalizeEndpoint(endpoint);
    return normalizeEndpoint(`/${endpoint}`);
  }

  if (path) {
    return normalizeEndpoint(path);
  }

  if (url.searchParams.has("chunk")) {
    return "/get-courses";
  }

  if (url.searchParams.has("q")) {
    return "/search";
  }

  return "/status";
}

function normalizeEndpoint(endpoint) {
  const allowed = new Set([
    "/status",
    "/get-courses",
    "/search",
    "/stats",
    "/trends",
  ]);

  const clean = String(endpoint || "/status").trim();

  if (allowed.has(clean)) {
    return clean;
  }

  return "/status";
}

function buildWorkerUrl(workerUrl, endpoint, originalParams) {
  const target = new URL(`${workerUrl}${endpoint}`);

  const blockedParams = new Set(["endpoint", "path"]);

  for (const [key, value] of originalParams.entries()) {
    if (blockedParams.has(key)) continue;
    target.searchParams.set(key, value);
  }

  return target.toString();
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  };
}
