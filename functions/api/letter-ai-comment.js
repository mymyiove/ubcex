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

    const results = [];

    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];

      const courseInfo = [];
      if (c.title) courseInfo.push("제목: " + c.title);
      if (c.category) courseInfo.push("카테고리: " + c.category);
      if (c.difficulty) courseInfo.push("난이도: " + c.difficulty);
      if (c.instructor) courseInfo.push("강사: " + c.instructor);
      if (c.rating) courseInfo.push("평점: " + c.rating);
      if (c.duration) courseInfo.push("수강시간: " + c.duration);
      if (c.headline) courseInfo.push("소개: " + c.headline);
      if (c.description) courseInfo.push("상세설명: " + c.description.substring(0, 1500));
      if (c.objectives) courseInfo.push("학습목표: " + c.objectives.substring(0, 500));

      const prompt = `너는 기업 교육 뉴스레터 에디터야. 아래 Udemy 강의를 기업 학습자에게 추천하려고 해.

이 강의를 왜 들어야 하는지 추천 이유를 한국어로 2~3줄로 써줘.
- 누구에게 특히 좋은지 (직무, 상황)
- 이 강의만의 차별점이나 매력 포인트
- 실무에 어떻게 도움이 되는지

톤: 친근하면서도 전문적, 힙하고 매력적으로!
강의 제목은 포함하지 마.
마크다운, 따옴표, 번호 없이 순수 텍스트만.

강의 정보:
${courseInfo.join("\n")}

추천 이유:`;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 1024
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
                temperature: 0.85,
                maxOutputTokens: 1024
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
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          results.push({ id: c.id, comment_ko: cleaned || "" });
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
