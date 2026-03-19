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
    var validKeys = [];
    for (var i = 0; i < keys.length; i++) {
      var val = texts[keys[i]];
      if (!val || (typeof val === 'string' && !val.trim())) continue;
      textList += '[[KEY:' + keys[i] + ']]\n' + val + '\n\n';
      validKeys.push(keys[i]);
    }

    if (!textList.trim() || validKeys.length === 0) {
      return new Response(JSON.stringify({ success: true, translations: {} }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var prompt = 'You are a professional Korean-to-English translator for Udemy Letter (corporate learning newsletter).\n' +
      'Translate the following Korean texts to natural, professional English.\n\n' +
      'RULES:\n' +
      '- Keep HTML tags exactly as-is\n' +
      '- Keep brand names as-is (Udemy, ChatGPT, etc.)\n' +
      '- Professional but friendly tone\n' +
      '- Return ONLY a JSON object matching the keys below\n' +
      '- No markdown, no code blocks, pure JSON only\n\n' +
      'Return format: {"key1":"english translation","key2":"english translation"}\n' +
      'Keys to translate: ' + validKeys.join(', ') + '\n\n' +
      'Texts:\n' + textList;

    var apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    var geminiData = null;

    for (var mi = 0; mi < models.length; mi++) {
      try {
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + models[mi] + ':generateContent?key=' + apiKey;
        var res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
          })
        });

        if (res.ok) {
          geminiData = await res.json();
          if (geminiData.candidates && geminiData.candidates[0]) break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!geminiData || !geminiData.candidates || !geminiData.candidates[0]) {
      return new Response(JSON.stringify({ success: false, error: 'All Gemini models failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var rawText = '';
    try {
      rawText = geminiData.candidates[0].content.parts[0].text || '';
    } catch (e) {
      rawText = '';
    }

    var cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    var translations = {};

    if (jsonMatch) {
      try {
        translations = JSON.parse(jsonMatch[0]);
      } catch (e) {
        translations = {};
      }
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
