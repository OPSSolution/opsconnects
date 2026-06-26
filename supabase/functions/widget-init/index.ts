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
      model:       "llama-3.1-8b-instant",
      max_tokens:  500,
      temperature: 0,
      messages: [
        {
          role:    "system",
          content: "Return ONLY a valid JSON object. No explanation, no markdown, no code block.",
        },
        {
          role:    "user",
          content: `You are setting up a chat widget for ${partnerName}. Using their business information below:

1. Write a short, friendly greeting the AI assistant should say when the chat opens (1–2 sentences, mention the business name, hint at what you can help with, use 1 emoji).
2. Extract 4–6 quick-topic chips a customer might click (short labels + helpful answers).

Business info:
${context}

Return ONLY this JSON structure:
{
  "greeting": "Hi there! 👋 I'm ${partnerName}'s AI assistant. I can help you with shopping, orders, and more!",
  "topics": [
    {"label": "Shop Products", "content": "Browse our products at https://example.com/shop"},
    {"label": "Track Order",   "content": "You can track your order at https://example.com/track"}
  ]
}`,
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
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { greeting?: string; topics?: Topic[] };
        greeting = parsed.greeting ?? null;
        topics   = parsed.topics   ?? [];
      }
    } catch { /* return empty */ }
  }

  return new Response(JSON.stringify({ greeting, topics }), { headers: CORS });
});
