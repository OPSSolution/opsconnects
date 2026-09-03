# Deploying Webhook Edge Functions

## Prerequisites

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

## 1. Run the schema migration

Open Supabase Dashboard → SQL Editor, paste and run `supabase-schema.sql`.

## 2. Set secrets for each channel

```bash
# Groq — required for the AI chat widget (ai-chat, widget-init)
supabase secrets set GROQ_API_KEY=gsk_...

# WhatsApp (Meta Business API)
supabase secrets set WHATSAPP_VERIFY_TOKEN=your_secret_token

# Telegram
supabase secrets set TELEGRAM_SECRET_TOKEN=your_secret_token

# Facebook Messenger
supabase secrets set MESSENGER_VERIFY_TOKEN=your_secret_token

# Instagram
supabase secrets set INSTAGRAM_VERIFY_TOKEN=your_secret_token

# LINE
supabase secrets set LINE_CHANNEL_SECRET=your_line_channel_secret

# WeChat
supabase secrets set WECHAT_TOKEN=your_wechat_token

# Resend — required for newsletter-subscribe confirmation emails
supabase secrets set RESEND_API_KEY=re_your_key_here
```

## 3. Deploy all functions

Channel webhooks are called directly by Meta/Telegram/LINE/WeChat, which never
send a Supabase JWT — they need `--no-verify-jwt` or the gateway rejects every
inbound message with 401 before your code (and its own signature checks) ever
runs. `chat-support`, `ai-chat`, `widget-init`, and `live-chat` are called by
anonymous website visitors through the public widget for the same reason.
`create-agent`, `delete-agent`, and `seed-demo-messages` are called by logged-in
partners from the dashboard, so they keep the default JWT verification (backed
by their own ownership check inside the function).

```bash
supabase functions deploy webhook-whatsapp  --no-verify-jwt
supabase functions deploy webhook-telegram  --no-verify-jwt
supabase functions deploy webhook-messenger --no-verify-jwt
supabase functions deploy webhook-instagram --no-verify-jwt
supabase functions deploy webhook-line      --no-verify-jwt
supabase functions deploy webhook-wechat    --no-verify-jwt
supabase functions deploy chat-support  --no-verify-jwt
supabase functions deploy ai-chat       --no-verify-jwt
supabase functions deploy widget-init   --no-verify-jwt
supabase functions deploy live-chat     --no-verify-jwt
supabase functions deploy create-agent
supabase functions deploy delete-agent
supabase functions deploy seed-demo-messages
supabase functions deploy newsletter-subscribe
```

## 4. Webhook URLs to paste into each platform

| Channel   | Webhook URL                                                                 |
| --------- | --------------------------------------------------------------------------- |
| WhatsApp  | `https://<ref>.supabase.co/functions/v1/webhook-whatsapp`                   |
| Telegram  | `https://<ref>.supabase.co/functions/v1/webhook-telegram?partner_id=<uuid>` |
| Messenger | `https://<ref>.supabase.co/functions/v1/webhook-messenger`                  |
| Instagram | `https://<ref>.supabase.co/functions/v1/webhook-instagram`                  |
| LINE      | `https://<ref>.supabase.co/functions/v1/webhook-line?partner_id=<uuid>`     |
| WeChat    | `https://<ref>.supabase.co/functions/v1/webhook-wechat?partner_id=<uuid>`   |

> For channels that use `partner_id` in the URL (Telegram, LINE, WeChat), find the UUID in the `partners` table in Supabase.
> For channels that resolve it automatically (WhatsApp, Messenger, Instagram), the function looks up `channel_configs` by the account ID sent in the payload.

## 5. Verify messages are being recorded

```sql
select channel, direction, sender_id, content, created_at
from public.messages
order by created_at desc
limit 20;
```

## 6. Make yourself an admin

There is no admin signup form — admin access is granted by hand:

1. Register/sign in as a normal partner first (or use an existing auth user).
2. Supabase Dashboard → Authentication → Users → select your user → **Raw App Meta Data** → set:
   ```json
   { "role": "admin" }
   ```
3. Log out and back in at `/login`. You'll land on `/admin`.

`app_metadata` can only be edited via the dashboard or the service-role API — never
by the user themselves — which is what makes it safe to trust for authorization.

