// functions/api/sync-courses.js
// POST /api/sync-courses — 외부 Cron 또는 수동 동기화 트리거

export async function onRequestPost(context) {
  const { env, request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // 간단한 인증 (선택사항 — SYNC_SECRET 환경변수 설정 시)
    if (env.SYNC_SECRET) {
      const body = await request.json().catch(() => ({}));
      if (body.secret !== env.SYNC_SECRET) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    const orgId = env.UDEMY_ORG_ID;
    const apiSubdomain = env.UDEMY_API_SUBDOMAIN;
    const clientId = env.UDEMY_CLIENT_ID;
    const clientSecret = env.UDEMY_CLIENT_SECRET;

    if (!orgId || !apiSubdomain || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "API credentials not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const authToken = btoa(`${clientId}:${clientSecret}`);
    const baseUrl = `https://${apiSubdomain}.udemy.com/api-2.0/organizations/${orgId}/courses/list/`;

    let allCourses = [];
    let page = 1;
    const pageSize = 100;
    let hasNext = true;
    let retryCount = 0;

    while (hasNext) {
      const apiUrl = `${baseUrl}?page=${page}&page_size=${pageSize}&fields[course]=@all`;

      try {
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Basic ${authToken}`,
            Accept: "application/json",
          },
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
          if (retryCount < 3) {
            retryCount++;
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          break;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Udemy API ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const results = data.results || [];
        allCourses = allCourses.concat(results.map(normalizeCourse));

        hasNext = !!data.next;
        page++;
        retryCount = 0;
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        if (retryCount < 3) { retryCount++; await new Promise((r) => setTimeout(r, 2000)); continue; }
        break;
      }
    }

    if (allCourses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No courses fetched. Check API credentials." }),
        { status: 400, headers: corsHeaders }
      );
    }

    await env.COURSE_CACHE.put(
      "courses_data",
      JSON.stringify({
        courses: allCourses,
        syncedAt: new Date().toISOString(),
        totalCount: allCourses.length,
      }),
      { expirationTtl: 60 * 60 * 24 * 7 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        totalCourses: allCourses.length,
        syncedAt: new Date().toISOString(),
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function normalizeCourse(course) {
  let categories = "";
  if (course.primary_category?.title) categories = course.primary_category.title;
  else if (course.categories?.length > 0) categories = course.categories.map((c) => c.title).join(", ");

  let topic = course.primary_subcategory?.title || "";
  let instructor = course.instructors?.length > 0
    ? course.instructors.map((i) => i.display_name || i.title || "").join(", ") : "";

  let subtitles = "";
  if (course.caption_languages?.length > 0) subtitles = course.caption_languages.join(", ");
  else if (course.caption_locales?.length > 0) subtitles = course.caption_locales.map((l) => l.locale || l).join(", ");

  let language = course.locale?.locale || course.locale || "en";
  if (typeof language === "string" && language.includes("_")) language = language.split("_")[0];

  let objectives = "";
  if (course.what_you_will_learn) {
    objectives = Array.isArray(course.what_you_will_learn) ? course.what_you_will_learn.join(" | ") : course.what_you_will_learn;
  }

  return {
    id: String(course.id), title: course.title || "", instructor, difficulty: course.level || "All Levels",
    category: categories, topic, headline: course.headline || "", objectives,
    description: course.description || "", language, subtitles: subtitles || "없음",
    lastUpdated: course.last_update_date || "", quiz: (course.num_quizzes || 0) > 0 || (course.num_practice_tests || 0) > 0,
    url: course.url || "", image: course.images?.image_240x135 || "",
    numLectures: course.num_lectures || 0, contentLength: course.estimated_content_length || 0,
  };
}
