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
        JSON.stringify({ success: false, error: "no courses" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "GEMINI_API_KEY not set" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Process one course at a time for reliability
    const results = [];

    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];

      const prompt = `너는 기업 교육 큐레이터야. 아래 Udemy 강의를 학습자에게 추천하려고 해.
이 강의를 왜 들어야 하는지, 누구에게 좋은지 힙하고 매력적으로 2줄로 써줘.
강의 제목은 포함하지 마. 순수 추천 이유만 써.
마크다운이나 따옴표 없이 순수 텍스트만 써줘.

강의 정보:
- 제목: ${c.title || ""}
- 카테고리: ${c.category || ""}
- 난이도: ${c.difficulty || ""}
- 강사: ${c.instructor || ""}
- 평점: ${c.rating || ""}
- 수강시간: ${c.duration || ""}
- 소개: ${c.headline || ""}

추천 이유 (2줄):`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 200
            }
          })
        });

        if (!res.ok) {
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
          res = await fetch(fallbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 200
              }
            })
          });
        }

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleaned = rawText
            .replace(/```[\s\S]*?```/g, "")
            .replace(/^\s*[-*•]\s*/gm, "")
            .replace(/^["'`]|["'`]$/g, "")
            .replace(/^\d+\.\s*/gm, "")
            .trim();

          if (cleaned && cleaned.length > 5) {
            results.push({ id: c.id, comment_ko: cleaned });
          } else {
            results.push({ id: c.id, comment_ko: "" });
          }
        } else {
          results.push({ id: c.id, comment_ko: "" });
        }
      } catch (e) {
        results.push({ id: c.id, comment_ko: "" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, comments: results }),
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
