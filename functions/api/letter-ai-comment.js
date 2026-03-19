export async function onRequestPost(context) {
  const { env, request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const courses = body.courses || [];

    if (courses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "no courses provided" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    let courseList = "";
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      courseList += `${i + 1}. ID:${c.id} / ${c.title || "untitled"} / rating:${c.rating || "-"} / duration:${c.duration || "-"} / instructor:${c.instructor || "-"} / category:${c.category || "-"} / difficulty:${c.difficulty || "-"} / headline:${c.headline || "-"}\n`;
    }

    const prompt = `당신은 Udemy Business 기업 교육 큐레이터입니다.
아래 각 강의에 대해 2줄 이내의 추천 코멘트를 한국어로 작성하세요.
형식: "누구에게 좋은지 + 왜 좋은지" 친근하고 전문적인 톤으로.
강의 제목을 코멘트에 포함하지 마세요.

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 순수 JSON만):
[{"id":"강의ID","comment_ko":"추천 코멘트 내용"}]

강의 목록:
${courseList}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let geminiRes = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      geminiRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(
          JSON.stringify({ success: false, error: `Gemini ${geminiRes.status}: ${errText.substring(0, 300)}` }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let comments;
    try {
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/$[\s\S]*?$/);
      comments = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      comments = [];
    }

    if (comments.length === 0) {
      const lines = rawText.split("\n").filter(l => l.trim().length > 10);
      for (let i = 0; i < courses.length && i < lines.length; i++) {
        const line = lines[i].replace(/^\d+[\.\)]\s*/, "").replace(/^["']|["']$/g, "").trim();
        if (!line.includes("{")) {
          comments.push({ id: courses[i].id, comment_ko: line });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, comments }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
