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
      courseList += (i + 1) + '. ID:' + c.id + ' / ' + (c.title || 'untitled') +
        ' / rating:' + (c.rating || '-') +
        ' / duration:' + (c.duration || '-') +
        ' / instructor:' + (c.instructor || '-') +
        ' / category:' + (c.category || '-') +
        ' / difficulty:' + (c.difficulty || '-') +
        ' / headline:' + (c.headline || '-') + '\n';
    }

    var prompt = '당신은 Udemy Business 기업 교육 큐레이터입니다.\n' +
      '아래 각 강의에 대해 2줄 이내의 추천 코멘트를 한국어로 작성하세요.\n' +
      '형식: "누구에게 좋은지 + 왜 좋은지" 친근하고 전문적인 톤으로.\n' +
      '강의 제목을 코멘트에 포함하지 마세요.\n\n' +
      '반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트나 마크다운 없이 순수 JSON만:\n' +
      '[{"id":"강의ID","comment_ko":"추천 코멘트"}]\n\n' +
      '강의 목록:\n' + courseList;

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
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
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
    var jsonMatch = cleaned.match(/$[\s\S]*?$/);
    var comments = [];

    if (jsonMatch) {
      try {
        comments = JSON.parse(jsonMatch[0]);
      } catch (e) {
        comments = [];
      }
    }

    if (comments.length === 0) {
      var lines = rawText.split('\n').filter(function(l) { return l.trim() && l.trim().length > 10; });
      for (var i = 0; i < courses.length && i < lines.length; i++) {
        var line = lines[i].replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim();
        if (line.indexOf('{') !== -1) continue;
        comments.push({ id: courses[i].id, comment_ko: line });
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
