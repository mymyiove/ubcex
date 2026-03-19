export async function onRequestPost(context) {
  const { env, request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const texts = body.texts || {};
    const keys = Object.keys(texts);

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "no texts to translate" }),
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

    let textList = "";
    const validKeys = [];
    for (let i = 0; i < keys.length; i++) {
      const val = texts[keys[i]];
      if (!val || (typeof val === "string" && !val.trim())) continue;
      textList += `[[KEY:${keys[i]}]]\n${val}\n\n`;
      validKeys.push(keys[i]);
    }

    if (!textList.trim() || validKeys.length === 0) {
      return new Response(
        JSON.stringify({ success: true, translations: {} }),
        { headers: corsHeaders }
      );
    }

    const prompt = `You are a professional Korean-to-English translator for Udemy Letter (corporate learning newsletter).
Translate the following Korean texts to natural, professional English.

RULES:
- Keep HTML tags exactly as-is (do not translate or modify HTML)
- Keep brand names as-is (Udemy, ChatGPT, Google, etc.)
- Professional but friendly tone
- Return ONLY a JSON object. No markdown, no code blocks.

Return format: {"key1":"english translation","key2":"english translation"}
Keys: ${validKeys.join(", ")}

Texts to translate:
${textList}`;

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
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
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
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
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

    let translations;
    try {
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      translations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      translations = {};
    }

    return new Response(
      JSON.stringify({ success: true, translations }),
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
