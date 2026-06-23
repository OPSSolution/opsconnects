#!/bin/bash
# Deploy all edge functions + secrets to the new Supabase project
# Run: bash tmp/deploy-new-supabase.sh

set -e

PROJECT_REF="dcplvklbigmtkyjdioez"

echo "▶ Linking to new project: $PROJECT_REF"
supabase link --project-ref $PROJECT_REF

echo ""
echo "▶ Setting secrets..."
supabase secrets set \
  GROQ_API_KEY=your_groq_api_key_here \
  RESEND_API_KEY=your_resend_api_key_here \
  --project-ref $PROJECT_REF

echo ""
echo "▶ Deploying all edge functions..."
FUNCTIONS=(
  ai-chat
  live-chat
  chat-support
  create-agent
  delete-agent
  widget-init
  newsletter-subscribe
  seed-demo-messages
  webhook-telegram
  webhook-whatsapp
  webhook-messenger
  webhook-instagram
  webhook-line
  webhook-wechat
)

for fn in "${FUNCTIONS[@]}"; do
  echo "  → deploying $fn"
  supabase functions deploy $fn --project-ref $PROJECT_REF
done

echo ""
echo "✅ Done! All functions deployed to $PROJECT_REF"
echo ""
echo "Next: update Render environment variables:"
echo "  VITE_PUBLIC_SUPABASE_URL  = https://dcplvklbigmtkyjdioez.supabase.co"
echo "  VITE_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_sHgTsPr07ADBYGrhwvLJ4w_cZm7s9e6"
