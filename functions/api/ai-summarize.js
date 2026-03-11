export async function onRequestPost(context) {
  const { env, request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const { title, headline, description, objectives } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ error: "title is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const prompt = `다음 Udemy Business 강의 정보를 분석하여 한국어로 요약해주세요.

강의명: ${title}
소개: ${headline || "없음"}
설명: ${(description || "없음").substring(0, 2000)}
학습목표: ${objectives || "없음"}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 순수 JSON만):
{
  "summary": "핵심 내용을 3-4문장으로 요약",
  "recommendedFor": ["이 강의를 추천하는 대상 2-3개"],
  "keyTopics": ["주요 학습 토픽 3-5개"],
  "practicalValue": "실무 활용도를 한 문장으로",
  "similarSearchTerms": ["이 강의와 비슷한 강의를 찾을 때 쓸 검색어 3개"]
}

JSON만 반환하고 마크다운 코드블록이나 설명을 추가하지 마세요.`;

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
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      });

      if (geminiRes.status === 429) {
        retries++;
        if (retries > maxRetries) break;
        const waitTime = Math.pow(2, retries) * 5000;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      break;
    }

    if (!geminiRes || !geminiRes.ok) {
      // 폴백: gemini-2.5-flash-lite
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
      geminiRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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
        summary: rawText,
        recommendedFor: [],
        keyTopics: [],
        practicalValue: "",
        similarSearchTerms: [],
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
