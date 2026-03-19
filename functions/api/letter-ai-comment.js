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
    var courses = body.courses || [];

    if (courses.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'no courses' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var courseList = '';
    for (var i = 0; i < courses.length; i++) {
      var c = courses[i];
      courseList += (i + 1) + '. [ID:' + c.id + '] ' + (c.title || '') +
        ' | rating:' + (c.rating || '') +
        ' | duration:' + (c.duration || '') +
        ' | instructor:' + (c.instructor || '') +
        ' | category:' + (c.category || '') +
        ' | difficulty:' + (c.difficulty || '') +
        ' | headline:' + (c.headline || '') + '\n';
    }

    var prompt = '당신은 Udemy Business 기업 교육 큐레이터입니다.\n' +
      '아래 각 강의에 대해 2줄 이내의 추천 코멘트를 한국어로 작성하세요.\n' +
      '형식: "누구에게 좋은지 + 왜 좋은지" 친근하고 전문적인 톤으로.\n' +
      '강의 제목을 코멘트에 포함하지 마세요.\n' +
      '마크다운 사용하지 마세요. 순수 텍스트만.\n' +
      'JSON 배열로만 반환: [{"id":"12345","comment_ko":"..."}]\n' +
      '다른 텍스트 없이 순수 JSON만 반환하세요.\n\n' +
      '강의 목록:\n' + courseList;

    var apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Use gemini-2.5-flash (same as ai-expand.js)
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      });

      if (geminiRes.status === 429) {
        retries++;
        if (retries > maxRetries) break;
        var waitTime = Math.pow(2, retries) * 5000;
        await new Promise(function(r) { setTimeout(r, waitTime); });
        continue;
      }
      break;
    }

    // Fallback to gemini-3.1-flash-lite-preview
    if (!geminiRes || !geminiRes.ok) {
      var fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=' + apiKey;
      geminiRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      });

      if (!geminiRes.ok) {
        var errText = await geminiRes.text();
        return new Response(JSON.stringify({ success: false, error: 'Gemini API ' + geminiRes.status + ': ' + errText.substring(0, 300) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    var geminiData = await geminiRes.json();

    if (!geminiData.candidates || !geminiData.candidates[0]) {
      return new Response(JSON.stringify({ success: false, error: 'No candidates returned', raw: JSON.stringify(geminiData).substring(0, 500) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var rawText = geminiData.candidates[0].content.parts[0].text || '';

    // Clean and parse JSON
    var cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    var jsonMatch = cleaned.match(/$[\s\S]*$/);
    var comments = [];

    if (jsonMatch) {
      try { comments = JSON.parse(jsonMatch[0]); } catch (e) { comments = []; }
    }

    // Fallback: line-by-line parsing
    if (comments.length === 0 && courses.length > 0) {
      var lines = rawText.split('\n').filter(function(l) { return l.trim() && l.trim().length > 10; });
      for (var i = 0; i < courses.length && i < lines.length; i++) {
        comments.push({
          id: courses[i].id,
          comment_ko: lines[i].replace(/^\d+[\.\)]\s*/, '').replace(/$.*?$\s*/, '').replace(/^["']|["']$/g, '').trim()
        });
      }
    }

    return new Response(JSON.stringify({ success: true, comments: comments }), {
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
