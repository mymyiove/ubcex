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

    var prompt = 'You are a corporate learning curator for Udemy Business.\n' +
      'For each course below, write a 2-line recommendation comment in Korean.\n' +
      'Format: "누구에게 좋은지 + 왜 좋은지" in a friendly, professional tone.\n' +
      'Do NOT include the course title in the comment.\n' +
      'Do NOT use markdown. Plain text only.\n' +
      'Return JSON array format: [{"id":"12345","comment_ko":"...","comment_en":"..."}]\n\n' +
      'Courses:\n' + courseList;

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
          temperature: 0.7,
          maxOutputTokens: 4096
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

    // Extract JSON from response
    var jsonMatch = rawText.match(/$[\s\S]*$/);
    var comments = [];
    if (jsonMatch) {
      try {
        comments = JSON.parse(jsonMatch[0]);
      } catch (e) {
        comments = [];
      }
    }

    // Fallback: parse line by line if JSON failed
    if (comments.length === 0 && courses.length > 0) {
      var lines = rawText.split('\n').filter(function(l) { return l.trim(); });
      for (var i = 0; i < courses.length && i < lines.length; i++) {
        comments.push({
          id: courses[i].id,
          comment_ko: lines[i].replace(/^\d+[\.\)]\s*/, '').replace(/$.*?$\s*/, '').trim(),
          comment_en: ''
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      comments: comments
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
