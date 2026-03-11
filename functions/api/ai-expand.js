export async function onRequestPost(context) {
  const { env, request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const { query, jobContext } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gemini API key not configured",
          debug: "Pages 환경변수에 GEMINI_API_KEY를 설정해주세요.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const prompt = `당신은 Udemy Business 강의 큐레이션 전문가입니다. 한국 기업의 직무 교육 담당자가 "${query}" 관련 강의를 찾고 있습니다.
${jobContext ? `사용자의 직무/관심 분야: ${jobContext}` : ""}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 순수 JSON만):
{
  "english_keywords": ["영어 검색 키워드 8-12개 - Udemy 강의 제목에서 실제로 쓰이는 용어 위주"],
  "korean_keywords": ["한국어 관련 키워드 3-5개"],
  "sub_topics": ["세부 주제/하위 분야 5-8개 (영어 위주, Udemy 강의 제목에 나올 법한)"],
  "related_tools": ["관련 도구/기술/프레임워크명 3-6개"],
  "recommended_queries": ["실제 Udemy 검색에 효과적인 복합 키워드 3-5개"]
}

중요 규칙:
1. Udemy Business 강의 제목은 대부분 영어이므로 영어 키워드를 충분히 포함
2. 너무 일반적인 키워드(예: "course", "learn")는 제외
3. 실제 Udemy에서 검색했을 때 결과가 나올 만한 구체적인 키워드 위주
4. JSON만 반환하고 마크다운 코드블록이나 설명을 추가하지 마세요`;

    // ★ 올바른 모델명: gemini-2.5-flash (안정 버전)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 429 에러 대비 재시도 로직
    let geminiRes = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });

      if (geminiRes.status === 429) {
        // 할당량 초과 — 대기 후 재시도
        retries++;
        if (retries > maxRetries) break;
        const waitTime = Math.pow(2, retries) * 5000; // 10초, 20초, 40초
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      break; // 429가 아니면 루프 탈출
    }

    if (!geminiRes || !geminiRes.ok) {
      // 2.5-flash 실패 시 2.5-flash-lite로 폴백
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
      geminiRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API ${geminiRes.status}: ${errText.substring(0, 300)}`);
      }
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        english_keywords: [query],
        korean_keywords: [query],
        sub_topics: [],
        related_tools: [],
        recommended_queries: [query],
        parseError: true,
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
