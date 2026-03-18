// ═══════════════════════════════════════════════════════════
// letter-save.js — 레터 데이터 저장 API
// POST /api/letter-save
// ═══════════════════════════════════════════════════════════
export async function onRequestPost(context) {
  var { request, env } = context;
  var ADMIN_SECRET = 'gogo1014';

  // 인증 확인
  var auth = request.headers.get('Authorization');
  if (!auth || auth !== 'Bearer ' + ADMIN_SECRET) {
    return new Response(JSON.stringify({ success: false, error: '인증 실패' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    var body = await request.json();
    var month = body.month; // "2026-03"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ success: false, error: '유효하지 않은 호수 형식 (YYYY-MM)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 레터 데이터 구조
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

      // 섹션 1: 트렌드 인사이트
      insight: {
        image: body.insight_image || '',
        pages: body.insight_pages || []
        // 각 page: { html_ko: '...', html_en: '...' }
      },

      // 섹션 2: 신규 콘텐츠
      newContent: {
        image: body.newContent_image || '',
        highlights: body.newContent_highlights || [],
        // 각 highlight: { badge, title_ko, title_en, desc_ko, desc_en, courses: [...] }
        summary: {
          ko: body.newContent_summary_ko || '',
          en: body.newContent_summary_en || ''
        }
      },

      // 섹션 3: 큐레이션
      curation: {
        image: body.curation_image || '',
        intro: {
          ko: body.curation_intro_ko || '',
          en: body.curation_intro_en || ''
        },
        tags: body.curation_tags || [],
        // 각 tag: { ko: '...', en: '...' }
        courseIds: body.curation_courseIds || [],
        // 강의 ID 배열 → Explorer KV에서 데이터 조회
        courseComments: body.curation_courseComments || {},
        // { "12345": { ko: "추천 코멘트...", en: "Recommended..." } }
        courseBadges: body.curation_courseBadges || {}
        // { "12345": { ko: "🔥 가장 인기", en: "🔥 Most Popular", class: "badge-popular" } }
      },

      // 섹션 4: 홍보
      promo: {
        pages: body.promo_pages || []
        // 각 page: { html_ko: '...', html_en: '...' }
      },

      // 마무리
      closing: {
        image: body.closing_image || '',
        message: {
          ko: body.closing_ko || '',
          en: body.closing_en || ''
        }
      },

      // 메타
      status: body.status || 'draft', // draft | published | sent
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentTo: body.sentTo || [],
      stats: body.stats || { sent: 0, opened: 0, clicked: 0 }
    };

    // KV에 저장
    var KV = env.COURSE_CACHE;
    await KV.put('letter_' + month, JSON.stringify(letterData));

    // 레터 목록(인덱스) 업데이트
    var indexRaw = await KV.get('letter_index');
    var index = indexRaw ? JSON.parse(indexRaw) : [];

    // 이미 있으면 업데이트, 없으면 추가
    var found = false;
    for (var i = 0; i < index.length; i++) {
      if (index[i].month === month) {
        index[i] = {
          month: month,
          title_ko: letterData.title.ko,
          title_en: letterData.title.en,
          status: letterData.status,
          updatedAt: letterData.updatedAt,
          coverImage: letterData.coverImage
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
        coverImage: letterData.coverImage
      });
    }

    // 최신순 정렬
    index.sort(function(a, b) { return b.month.localeCompare(a.month); });

    await KV.put('letter_index', JSON.stringify(index));

    return new Response(JSON.stringify({
      success: true,
      message: month + '호 저장 완료',
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

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
