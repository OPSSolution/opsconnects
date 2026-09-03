export const partnerChannels = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: "ri-whatsapp-line",
    color: "#25D366",
    description: "Connect your WhatsApp Business account to manage customer conversations through the official WhatsApp Business API.",
    steps: [
      { num: 1, title: "Verify Business", desc: "Ensure your business is verified on Meta Business Platform with a valid phone number." },
      { num: 2, title: "Get API Credentials", desc: "Create a WhatsApp Business App in Meta Developer Console and obtain your Phone Number ID and Access Token." },
      { num: 3, title: "Configure Webhook", desc: "Set up a webhook endpoint to receive incoming messages and status updates in real-time." },
      { num: 4, title: "Test Connection", desc: "Send a test message from your WhatsApp number to verify the integration is working." },
    ],
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    icon: "ri-telegram-line",
    color: "#26A5E4",
    description: "Connect your Telegram Bot to automate conversations and manage customer messages through Telegram's Bot API.",
    steps: [
      { num: 1, title: "Create Bot", desc: "Message @BotFather on Telegram and use /newbot to create your bot. Save the API token." },
      { num: 2, title: "Configure Bot Settings", desc: "Set your bot's name, description, about text, and profile picture through @BotFather." },
      { num: 3, title: "Set Webhook URL", desc: "Register your webhook URL to receive incoming messages. We'll provide your unique webhook endpoint." },
      { num: 4, title: "Enable Inline Mode", desc: "Optionally enable inline queries so users can interact with your bot from any chat." },
    ],
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    icon: "ri-messenger-line",
    color: "#0084FF",
    description: "Connect your Facebook Page to handle Messenger conversations alongside all your other messaging channels.",
    steps: [
      { num: 1, title: "Link Facebook Page", desc: "Connect your business Facebook Page through OAuth. You'll need admin access to the page." },
      { num: 2, title: "Generate Page Token", desc: "Obtain a Page Access Token with messenger permissions from the Facebook Graph API." },
      { num: 3, title: "Subscribe to Webhooks", desc: "Subscribe your webhook to receive message events, message delivery confirmations, and read receipts." },
      { num: 4, title: "Set Greeting & Menu", desc: "Customize the welcome greeting and persistent menu that users see when they open your chat." },
    ],
  },
  {
    id: "instagram",
    name: "Instagram Messaging",
    icon: "ri-instagram-line",
    color: "#E4405F",
    description: "Connect your Instagram Professional account to manage DMs directly from your unified OPSConnect inbox.",
    steps: [
      { num: 1, title: "Professional Account", desc: "Ensure your Instagram account is set to Professional or Business type in account settings." },
      { num: 2, title: "Connect Facebook Page", desc: "Link your Instagram account to a Facebook Page through Meta Business Suite." },
      { num: 3, title: "API Configuration", desc: "Configure Instagram Messaging API credentials including App ID and App Secret from Meta Developer Console." },
      { num: 4, title: "DM Automation Setup", desc: "Set up automated welcome messages, quick replies, and away messages for your Instagram DMs." },
    ],
  },
  {
    id: "line",
    name: "LINE Messaging",
    icon: "ri-line-line",
    color: "#00C300",
    description: "Connect your LINE Official Account to engage with customers across Asian markets through LINE's Messaging API.",
    steps: [
      { num: 1, title: "Create LINE Account", desc: "Register a LINE Official Account at LINE Developers Console with your business details." },
      { num: 2, title: "Channel Configuration", desc: "Create a Messaging API channel and obtain your Channel ID, Channel Secret, and Access Token." },
      { num: 3, title: "LIFF Integration", desc: "Set up LINE Front-end Framework (LIFF) for rich in-app web experiences within the LINE app." },
      { num: 4, title: "Rich Menu Designer", desc: "Design and upload a rich menu with tappable areas for quick customer actions and navigation." },
    ],
  },
  {
    id: "email",
    name: "Email Support",
    icon: "ri-mail-line",
    color: "#EA4335",
    description: "Connect your email inbox to manage customer support emails alongside all your messaging channels.",
    steps: [
      { num: 1, title: "Email Configuration", desc: "Configure your SMTP and IMAP settings to send and receive emails through OPSConnect." },
      { num: 2, title: "Forwarding Rules", desc: "Set up automatic forwarding rules to route customer emails into your unified inbox." },
      { num: 3, title: "Signature & Templates", desc: "Create email signatures and response templates for consistent brand communication." },
      { num: 4, title: "Spam Protection", desc: "Configure DKIM, SPF, and DMARC records to ensure high email deliverability and prevent spam." },
    ],
  },
  {
    id: "livechat",
    name: "Live Chat Widget",
    icon: "ri-chat-3-line",
    color: "#1E7FC2",
    description: "Embed a customizable live chat widget on your website to convert visitors into conversations instantly.",
    steps: [
      { num: 1, title: "Widget Customization", desc: "Customize your chat widget's colors, positioning, welcome message, and branding." },
      { num: 2, title: "Team Assignment", desc: "Configure routing rules to assign incoming chats to specific team members or departments." },
      { num: 3, title: "Proactive Triggers", desc: "Set up proactive chat invitations based on visitor behavior, time on page, or specific URLs." },
      { num: 4, title: "Offline Form", desc: "Design an offline contact form that captures leads when your team is away from the desk." },
    ],
  },
  {
    id: "wechat",
    name: "WeChat Official",
    icon: "ri-wechat-line",
    color: "#07C160",
    description: "Connect your WeChat Official Account to serve customers across China's essential messaging ecosystem.",
    steps: [
      { num: 1, title: "Account Verification", desc: "Verify your WeChat Official Account with business license and identity documents. Service accounts preferred for API access." },
      { num: 2, title: "Server Configuration", desc: "Configure your server URL, Token, and EncodingAESKey in the WeChat Official Account backend." },
      { num: 3, title: "Menu & Auto-Reply", desc: "Build custom menus, keyword auto-replies, and welcome messages for your followers." },
      { num: 4, title: "Mini Program Setup", desc: "Optionally link a WeChat Mini Program for richer in-app experiences and e-commerce capabilities." },
    ],
  },
];

export const apiEndpoints = [
  { method: "POST", path: "/functions/v1/ai-chat", description: "Get an AI-generated reply for a widget conversation" },
  { method: "GET", path: "/functions/v1/widget-init", description: "Fetch the AI greeting and topic chips for your widget" },
  { method: "POST", path: "/functions/v1/live-chat", description: "Start a live chat session, or send a visitor's follow-up message" },
  { method: "GET", path: "/functions/v1/live-chat", description: "Poll a live chat session for new agent replies" },
];

// Matches the real snippet generated in the partner dashboard
// (src/pages/dashboard/page.tsx generateEmbedCode()) — same widget.js,
// same data attributes. YOUR_PARTNER_ID and YOUR_PROJECT come from your
// actual dashboard once you sign up.
export const embedCodeExample = `<script
  src="https://chat.opssolutions.tech/widget.js"
  data-partner-id="YOUR_PARTNER_ID"
  data-api="https://YOUR_PROJECT.supabase.co/functions/v1">
</script>`;