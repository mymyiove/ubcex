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
    var month = body.month;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ success: false, error: 'invalid month format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    var letterData = {
      month: month,
      title: {
        ko: body.title_ko || '',
        en: body.title_en || ''
      },
      subtitle: {
        ko: body.subtitle_ko || '',
        en: body.subtitle_en || ''
      },
      coverImage: body.coverImage || '',
      readingTime: {
        ko: body.readingTime_ko || '📖 읽는 시간: 약 5분',
        en: body.readingTime_en || '📖 Reading time: ~5 min'
      },

      insight: {
        image: body.insight_image || '',
        pages: body.insight_pages || [],
        courseIds: body.insight_courseIds || [],
        courseComments: body.insight_courseComments || {},
        courseBadges: body.insight_courseBadges || {},
        layout: body.insight_layout || 'card'
      },

      newContent: {
        image: body.newContent_image || '',
        editorHtml: {
          ko: body.newContent_editorHtml_ko || '',
          en: body.newContent_editorHtml_en || ''
        },
        highlights: body.newContent_highlights || [],
        summary: {
          ko: body.newContent_summary_ko || '',
          en: body.newContent_summary_en || ''
        },
        courseIds: body.newContent_courseIds || [],
        courseComments: body.newContent_courseComments || {},
        courseBadges: body.newContent_courseBadges || {},
        layout: body.newContent_layout || 'highlight'
      },

      curation: {
        image: body.curation_image || '',
        intro: {
          ko: body.curation_intro_ko || '',
          en: body.curation_intro_en || ''
        },
        tags: body.curation_tags || [],
        courseIds: body.curation_courseIds || [],
        courseComments: body.curation_courseComments || {},
        courseBadges: body.curation_courseBadges || {},
        layout: body.curation_layout || 'list'
      },

      promo: {
        pages: body.promo_pages || []
      },

      closing: {
        image: body.closing_image || '',
        message: {
          ko: body.closing_ko || '',
          en: body.closing_en || ''
        }
      },

      status: body.status || 'draft',
      lastEditor: body.lastEditor || '',
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentTo: body.sentTo || [],
      stats: body.stats || { sent: 0, opened: 0, clicked: 0 }
    };

    var KV = env.COURSE_CACHE;
    await KV.put('letter_' + month, JSON.stringify(letterData));

    var indexRaw = await KV.get('letter_index');
    var index = indexRaw ? JSON.parse(indexRaw) : [];

    var found = false;
    for (var i = 0; i < index.length; i++) {
      if (index[i].month === month) {
        index[i] = {
          month: month,
          title_ko: letterData.title.ko,
          title_en: letterData.title.en,
          status: letterData.status,
          updatedAt: letterData.updatedAt,
          coverImage: letterData.coverImage,
          lastEditor: letterData.lastEditor
        };
        found = true;
        break;
      }
    }
    if (!found) {
      index.push({
        month: month,
        title_ko: letterData.title.ko,
        title_en: letterData.title.en,
        status: letterData.status,
        updatedAt: letterData.updatedAt,
        coverImage: letterData.coverImage,
        lastEditor: letterData.lastEditor
      });
    }

    index.sort(function(a, b) { return b.month.localeCompare(a.month); });
    await KV.put('letter_index', JSON.stringify(index));

    return new Response(JSON.stringify({
      success: true,
      message: month + ' saved',
      data: letterData
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
