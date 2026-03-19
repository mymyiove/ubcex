export async function onRequestPost(context) {
  const { request } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json();
    const texts = body.texts || {};
    const keys = Object.keys(texts);

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "no texts" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const translations = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let val = texts[key];

      if (!val || (typeof val === "string" && !val.trim())) {
        translations[key] = "";
        continue;
      }

      // Strip HTML for translation, keep original for HTML content
      const isHtml = val.indexOf("<") !== -1;
      let textToTranslate = val;

      if (isHtml) {
        // For HTML content, translate text parts only
        // Simple approach: strip tags, translate, note it won't preserve HTML perfectly
        // But for newsletter content this is acceptable
        textToTranslate = val.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }

      // Limit text length to avoid issues
      if (textToTranslate.length > 3000) {
        textToTranslate = textToTranslate.substring(0, 3000);
      }

      try {
        const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=" + encodeURIComponent(textToTranslate);

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          let translated = "";
          if (data && data[0]) {
            for (let j = 0; j < data[0].length; j++) {
              if (data[0][j] && data[0][j][0]) {
                translated += data[0][j][0];
              }
            }
          }
          translations[key] = translated.trim();
        } else {
          translations[key] = "";
        }
      } catch (e) {
        translations[key] = "";
      }

      // Small delay to avoid rate limiting
      if (i < keys.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return new Response(
      JSON.stringify({ success: true, translations }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
