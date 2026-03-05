// functions/api/courses.js
// GET /api/courses — 캐시된 강의 데이터 조회 + 자동 동기화 트리거

export async function onRequestGet(context) {
  const { env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // KV에서 캐시 데이터 가져오기
    const cached = await env.COURSE_CACHE.get("courses_data", { type: "json" });

    if (!cached) {
      // 캐시 없음 → 동기화 필요
      // 백그라운드에서 동기화 시작
      context.waitUntil(syncCoursesBackground(env));

      return new Response(
        JSON.stringify({
          courses: [],
          syncedAt: null,
          totalCount: 0,
          syncing: true,
          message: "첫 동기화를 시작합니다. 잠시 후 새로고침해주세요.",
        }),
        { headers: corsHeaders }
      );
    }

    // 캐시가 24시간 이상 지났으면 백그라운드 동기화
    const syncedAt = new Date(cached.syncedAt);
    const hoursSinceSync = (Date.now() - syncedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync > 24) {
      context.waitUntil(syncCoursesBackground(env));
    }

    return new Response(
      JSON.stringify({
        courses: cached.courses,
        syncedAt: cached.syncedAt,
        totalCount: cached.totalCount,
        syncing: false,
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

// 백그라운드 동기화 함수
async function syncCoursesBackground(env) {
  try {
    const orgId = env.UDEMY_ORG_ID;
    const apiSubdomain = env.UDEMY_API_SUBDOMAIN;
    const clientId = env.UDEMY_CLIENT_ID;
    const clientSecret = env.UDEMY_CLIENT_SECRET;

    if (!orgId || !apiSubdomain || !clientId || !clientSecret) {
      console.error("Missing Udemy API credentials in environment variables");
      return;
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

        if (!response.ok) break;

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

    if (allCourses.length > 0) {
      await env.COURSE_CACHE.put(
        "courses_data",
        JSON.stringify({
          courses: allCourses,
          syncedAt: new Date().toISOString(),
          totalCount: allCourses.length,
        }),
        { expirationTtl: 60 * 60 * 24 * 7 }
      );
      console.log(`Synced ${allCourses.length} courses`);
    }
  } catch (err) {
    console.error("Background sync error:", err);
  }
}

function normalizeCourse(course) {
  let categories = "";
  if (course.primary_category?.title) {
    categories = course.primary_category.title;
  } else if (course.categories?.length > 0) {
    categories = course.categories.map((c) => c.title).join(", ");
  }

  let topic = course.primary_subcategory?.title || "";

  let instructor = "";
  if (course.instructors?.length > 0) {
    instructor = course.instructors.map((i) => i.display_name || i.title || "").join(", ");
  }

  let subtitles = "";
  if (course.caption_languages?.length > 0) {
    subtitles = course.caption_languages.join(", ");
  } else if (course.caption_locales?.length > 0) {
    subtitles = course.caption_locales.map((l) => l.locale || l).join(", ");
  }

  let language = course.locale?.locale || course.locale || "en";
  if (typeof language === "string" && language.includes("_")) {
    language = language.split("_")[0];
  }

  let objectives = "";
  if (course.what_you_will_learn) {
    objectives = Array.isArray(course.what_you_will_learn)
      ? course.what_you_will_learn.join(" | ")
      : course.what_you_will_learn;
  }

  return {
    id: String(course.id),
    title: course.title || "",
    instructor,
    difficulty: course.level || "All Levels",
    category: categories,
    topic,
    headline: course.headline || "",
    objectives,
    description: course.description || "",
    language,
    subtitles: subtitles || "없음",
    lastUpdated: course.last_update_date || "",
    quiz: (course.num_quizzes || 0) > 0 || (course.num_practice_tests || 0) > 0,
    url: course.url || "",
    image: course.images?.image_240x135 || "",
    numLectures: course.num_lectures || 0,
    contentLength: course.estimated_content_length || 0,
  };
}
