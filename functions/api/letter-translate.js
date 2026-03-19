export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env;
  var ADMIN_SECRET = 'gogo1014';

  var auth = request.headers.get('Authorization');
  if (!auth || auth !== 'Bearer ' + ADMIN_SECRET) {
    return new Response(JSON.stringify({ success: false, error: 'auth failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    var body = await request.json();
    var texts = body.texts || {};

    var keys = Object.keys(texts);
    if (keys.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'no texts' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var textList = '';
    for (var i = 0; i < keys.length; i++) {
      var val = texts[keys[i]];
      if (!val || (typeof val === 'string' && !val.trim())) continue;
      textList += '[[KEY:' + keys[i] + ']]\n' + val + '\n\n';
    }

    if (!textList.trim()) {
      return new Response(JSON.stringify({ success: true, translations: {} }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var prompt = 'You are a professional Korean-to-English translator for Udemy Letter (corporate learning newsletter).\n' +
      'Translate the following Korean texts to natural, professional English.\n\n' +
      'RULES:\n' +
      '- Keep HTML tags as-is\n' +
      '- Keep brand names as-is (Udemy, ChatGPT, etc.)\n' +
      '- Keep course titles in original language\n' +
      '- Professional but friendly tone\n' +
      '- Return ONLY a JSON object: {"key1":"translated","key2":"translated"}\n' +
      '- Each key matches the [[KEY:xxx]] marker\n' +
      '- No markdown, no code blocks, pure JSON only\n\n' +
      'Texts:\n' + textList;

    var apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

    var geminiRes = null;
    var retries = 0;
    var maxRetries = 3;

    while (retries <= maxRetries) {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
        })
      });

      if (geminiRes.status === 429) {
        retries++;
        if (retries > maxRetries) break;
        await new Promise(function(r) { setTimeout(r, Math.pow(2, retries) * 5000); });
        continue;
      }
      break;
    }

    if (!geminiRes || !geminiRes.ok) {
      var fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=' + apiKey;
      geminiRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
        })
      });

      if (!geminiRes.ok) {
        var errText = await geminiRes.text();
        return new Response(JSON.stringify({ success: false, error: 'Gemini ' + geminiRes.status + ': ' + errText.substring(0, 300) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    var geminiData = await geminiRes.json();

    if (!geminiData.candidates || !geminiData.candidates[0]) {
      return new Response(JSON.stringify({ success: false, error: 'No candidates', raw: JSON.stringify(geminiData).substring(0, 500) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var rawText = geminiData.candidates[0].content.parts[0].text || '';
    var cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    var translations = {};

    if (jsonMatch) {
      try { translations = JSON.parse(jsonMatch[0]); } catch (e) { translations = {}; }
    }

    return new Response(JSON.stringify({ success: true, translations: translations }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
