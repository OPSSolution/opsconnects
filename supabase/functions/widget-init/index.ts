import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY              = Deno.env.get("GROQ_API_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type":                 "application/json",
};

type Topic = { label: string; content: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url       = new URL(req.url);
  const partnerId = url.searchParams.get("partner_id") ?? "";

  if (!partnerId) {
    return new Response(JSON.stringify({ greeting: null, topics: [] }), { headers: CORS });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: partner } = await supabase
    .from("partners")
    .select("partner_name, ai_business_context")
    .eq("partner_id", partnerId)
    .maybeSingle();

  const context     = (partner?.ai_business_context as string | null) ?? "";
  const partnerName = (partner?.partner_name as string | null) ?? "Support";

  if (!context.trim()) {
    return new Response(JSON.stringify({ greeting: null, topics: [] }), { headers: CORS });
  }

  // Single AI call: generate both the greeting and topic chips
  const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      max_tokens:  600,
      temperature: 0,
      messages: [
        {
          role:    "system",
          content: "Return ONLY a valid JSON object. No explanation, no markdown, no code block.",
        },
        {
          role:    "user",
          content: `You are setting up a chat widget for "${partnerName}". Read their business information below carefully.

Tasks:
1. Write a short, friendly GREETING (1–2 sentences) the AI assistant says when the chat opens. Mention the business name, hint at 2–3 key things you can help with, add 1 relevant emoji. Do NOT use placeholder text.
2. Extract 4–6 TOPIC CHIPS a customer might click. Each chip needs:
   - "label": 2–4 word button text
   - "content": the actual helpful answer from the business info (include real phone numbers, emails, URLs from the text — never invent URLs)

Business info:
${context}

Return ONLY valid JSON (no markdown, no code block):
{"greeting":"...","topics":[{"label":"...","content":"..."}]}`,
        },
      ],
    }),
  });

  let greeting: string | null = null;
  let topics: Topic[]         = [];

  if (apiRes.ok) {
    const aiData = await apiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw    = aiData.choices?.[0]?.message?.content ?? "{}";
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { greeting?: string; topics?: Topic[] };
        greeting = parsed.greeting ?? null;
        topics   = Array.isArray(parsed.topics) ? parsed.topics : [];
      }
    } catch { /* return empty */ }
  }

  return new Response(JSON.stringify({ greeting, topics }), { headers: CORS });
});
