const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const tg = (method: string, body: Record<string, unknown>) =>
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok");

  try {
    const update = await req.json() as Record<string, unknown>;
    const message = update.message as Record<string, unknown> | undefined;
    if (!message) return new Response("ok");

    const chat = message.chat as Record<string, unknown>;
    const chatId = chat.id as number;
    const text = (message.text as string | undefined) ?? "";

    if (text.startsWith("/start")) {
      await tg("sendMessage", {
        chat_id: chatId,
        parse_mode: "HTML",
        text: [
          "👋 <b>Welcome to OPSConnect Alerts!</b>",
          "",
          "Your Telegram Chat ID is:",
          `<code>${chatId}</code>`,
          "",
          "📋 Copy the number above and paste it in your OPSConnect dashboard:",
          "<b>Profile → Telegram Chat ID → Save</b>",
          "",
          "Once saved, you'll get instant alerts here whenever a visitor starts a live chat.",
        ].join("\n"),
      });
    }
  } catch {
    // ignore malformed updates
  }

  return new Response("ok");
});
