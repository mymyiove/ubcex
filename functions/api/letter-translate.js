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

    // texts = { key1: "한국어 텍스트", key2: "한국어 텍스트", ... }
    var keys = Object.keys(texts);
    if (keys.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'no texts to translate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Build prompt
    var textList = '';
    for (var i = 0; i < keys.length; i++) {
      var val = texts[keys[i]];
      if (!val || !val.trim()) continue;
      // Strip HTML tags for translation but keep structure info
      textList += '[[KEY:' + keys[i] + ']]\n' + val + '\n\n';
    }

    if (!textList.trim()) {
      return new Response(JSON.stringify({ success: true, translations: {} }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var prompt = 'You are a professional Korean-to-English translator for a corporate learning newsletter (Udemy Letter).\n' +
      'Translate the following Korean texts to natural, professional English.\n' +
      'IMPORTANT RULES:\n' +
      '- Keep HTML tags as-is (do not translate HTML tags)\n' +
      '- Keep brand names as-is (Udemy, ChatGPT, etc.)\n' +
      '- Keep course titles in their original language\n' +
      '- Use professional but friendly tone\n' +
      '- Return JSON object format: {"key1":"translated text","key2":"translated text"}\n' +
      '- Each key corresponds to the [[KEY:xxx]] marker\n\n' +
      'Texts to translate:\n' + textList;

    var GEMINI_KEY = env.GEMINI_API_KEY || '';
    if (!GEMINI_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_KEY;

    var geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192
        }
      })
    });

    var geminiData = await geminiRes.json();

    if (!geminiData.candidates || !geminiData.candidates[0]) {
      return new Response(JSON.stringify({ success: false, error: 'Gemini returned no candidates' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var rawText = geminiData.candidates[0].content.parts[0].text || '';

    // Extract JSON
    var jsonMatch = rawText.match(/\{[\s\S]*\}/);
    var translations = {};
    if (jsonMatch) {
      try {
        translations = JSON.parse(jsonMatch[0]);
      } catch (e) {
        translations = {};
      }
    }

    return new Response(JSON.stringify({
      success: true,
      translations: translations
    }), {
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
