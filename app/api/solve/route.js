export const runtime = "nodejs";

const PROMPT = `You are looking at a photo of one or more math problems.
Some photos contain a single question; others contain several separate main questions, numbered like 1, 2, 3.
Sub-parts of the SAME question — labeled i, ii, iii, or a, b, c — are NOT separate main questions. Keep every sub-part together under its one parent question.

For each main question found in the photo, provide:
- number: the question's number as printed (e.g. "1", "2"). If the photo has only one unnumbered question, use "1".
- problem: the full problem exactly as written, including any sub-parts.
- solution: a complete, step-by-step worked solution covering every sub-part, written as plain text paragraphs. Do not use LaTeX — write math plainly, e.g. x^2, sqrt(x), 3/4, 5*x.
- answer: the final answer(s), one line per sub-part if there is more than one, clearly labeled.

Reply with ONLY JSON in exactly this shape, no other text:
{"questions": [{"number": "1", "problem": "...", "solution": "...", "answer": "..."}]}

If the photo contains no math problem at all, reply with {"questions": []}.`;

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "The server isn't configured with a Gemini API key yet. Set GEMINI_API_KEY in your Vercel project's environment variables.",
      },
      { status: 500 }
    );
  }

  let formData;
  try {
    formData = await req.formData();
  } catch (e) {
    return Response.json({ error: "Couldn't read the uploaded photo." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!image || typeof image === "string") {
    return Response.json({ error: "No photo was uploaded." }, { status: 400 });
  }

  const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  if (image.size > MAX_BYTES) {
    return Response.json(
      { error: "That photo is too large — try one under 20 MB." },
      { status: 400 }
    );
  }

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = image.type || "image/jpeg";

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  let geminiRes;
  try {
    geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return Response.json(
      { error: "Couldn't reach Gemini — check your connection and try again." },
      { status: 502 }
    );
  }

  if (!geminiRes.ok) {
    let message = "Gemini couldn't process that photo.";
    if (geminiRes.status === 400) message = "Gemini rejected the request — check your API key and model name.";
    if (geminiRes.status === 403) message = "That Gemini API key isn't valid or doesn't have access.";
    if (geminiRes.status === 429) message = "Gemini's free-tier rate limit was hit — wait a moment and try again.";
    return Response.json({ error: message }, { status: 502 });
  }

  const data = await geminiRes.json();

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return Response.json(
      { error: "Couldn't make out a clean answer from that photo — try a clearer shot." },
      { status: 502 }
    );
  }

  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return Response.json({ questions });
}
