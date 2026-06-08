import { useState, useRef, useEffect } from "react";
import { stats } from "@/mocks/homepage";

export default function HeroSection() {
  const [chatMessages, setChatMessages] = useState<{ role: "customer" | "agent"; text: string }[]>([
    { role: "customer", text: "Hey, I need help with my order #45291" },
    { role: "agent", text: "Hi! Sure, let me check that for you right away." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatMsgsRef = useRef<HTMLDivElement>(null);

  const handleChatSend = () => {
    const txt = chatInput.trim();
    if (!txt) return;
    setChatMessages((prev) => [...prev, { role: "customer", text: txt }]);
    setChatInput("");
    const replies = [
      "Thanks for reaching out! OmniConnect unifies WhatsApp, Messenger, Instagram, Telegram, LINE, Email, Live Chat, and WeChat into one seamless dashboard.",
      "Great question! Our shared team inbox makes it easy for your whole support team to collaborate on conversations in real time.",
      "Did you know OmniConnect includes AI-powered chatbots that can handle common questions automatically, 24/7? Saves your team hours every week.",
      "Our real-time translation means you can chat with customers in over 90 languages — they type in theirs, you read in yours.",
      "You can set up any channel in just a few minutes. Head over to our Partners page to grab a step-by-step setup guide.",
      "OmniConnect gives you full analytics and reporting across all your messaging channels so you always know your response times and CSAT scores.",
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: "agent", text: reply }]);
    }, 800 + Math.random() * 1400);
  };

  useEffect(() => {
    if (chatMsgsRef.current) {
      chatMsgsRef.current.scrollTop = chatMsgsRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Abstract%20geometric%20gradient%20background%20with%20warm%20orange%20and%20cream%20tones%2C%20soft%20flowing%20curved%20shapes%20blending%20organically%2C%20minimalist%20modern%20design%20with%20smooth%20color%20transitions%2C%20light%20airy%20atmosphere%2C%20subtle%20textured%20overlay%2C%20professional%20corporate%20aesthetic%20with%20artistic%20abstract%20elements%2C%20high%20quality%20digital%20art%20render&width=1920&height=1080&seq=hero-bg-v2&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-background-50" />
      </div>

      <div className="relative z-10 w-full px-4 md:px-6 pt-24 md:pt-28 pb-16">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-50/20 backdrop-blur-sm border border-background-50/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
              <span className="text-xs font-medium text-background-50/90">Now supporting 8 messaging channels</span>
            </div>

            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-background-50 leading-tight tracking-tight">
              Every customer
              <br />
              conversation,
              <br />
              <span className="text-primary-400">one unified inbox.</span>
            </h1>

            <p className="mt-5 text-sm md:text-base text-background-50/70 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Connect WhatsApp, Messenger, Instagram, Telegram, LINE, Email, Live Chat, and WeChat.
              AI chatbots handle the simple stuff, your team handles the rest.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <a
                href="#"
                className="w-full sm:w-auto text-sm font-semibold bg-primary-500 text-background-50 dark:text-foreground-950 hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer px-7 py-3.5 rounded-md text-center"
              >
                Start Free Trial
              </a>
              <a
                href="#integrations"
                className="w-full sm:w-auto text-sm font-medium text-background-50/80 hover:text-background-50 transition-colors whitespace-nowrap cursor-pointer px-7 py-3.5 rounded-md border border-background-50/30 text-center"
              >
                See Integrations
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="font-heading text-xl md:text-2xl font-bold text-background-50">
                    {stat.value}
                  </div>
                  <div className="text-xs text-background-50/50 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full max-w-md lg:max-w-lg">
            <div className="bg-background-50/95 backdrop-blur-sm rounded-xl border border-background-200/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-background-200/50">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-400" />
                </div>
                <span className="text-xs text-foreground-500 font-medium ml-2">OmniConnect Inbox</span>
                <span className="ml-auto flex items-center gap-1 text-xs text-foreground-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500" /> Live
                </span>
              </div>
              <div ref={chatMsgsRef} className="p-4 space-y-3 min-h-[300px] max-h-[320px] overflow-y-auto">
                {chatMessages.map((msg, i) => {
                  const isCustomer = msg.role === "customer";
                  return (
                    <div
                      key={i}
                      className={`flex ${isCustomer ? "justify-start" : "justify-end"} animate-[fadeInUp_0.4s_ease-out]`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isCustomer
                            ? "bg-background-100 text-foreground-800 rounded-bl-md"
                            : "bg-primary-500 text-background-50 rounded-br-md"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-background-200/50 px-4 py-3 flex items-center gap-2">
                <i className="ri-add-circle-line text-lg text-foreground-400" />
                <input
                  type="text"
                  placeholder="Try typing a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleChatSend(); }}
                  className="flex-1 text-xs text-foreground-500 bg-transparent outline-none"
                />
                <button onClick={handleChatSend} className="w-8 h-8 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <i className="ri-send-plane-fill text-lg text-primary-500"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}