import { useNavigate } from "react-router-dom";
import { platforms } from "@/mocks/homepage";

const platformChannelMap: Record<string, string> = {
  "WhatsApp": "whatsapp",
  "Facebook Messenger": "messenger",
  "Instagram": "instagram",
  "Telegram": "telegram",
  "LINE": "line",
  "Email": "email",
  "Live Chat": "livechat",
  "WeChat": "wechat",
};

export default function PlatformShowcase() {
  const navigate = useNavigate();

  const handlePlatformClick = (platformName: string) => {
    const channelId = platformChannelMap[platformName] || platformName.toLowerCase().replace(/\s+/g, "");
    navigate(`/partners?channel=${channelId}#connect`);
  };

  return (
    <section id="integrations" className="py-16 md:py-20 px-4 md:px-6 bg-background-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-3">
            Integrations
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground-950 leading-tight">
            Every channel your customers use,
            <br />
            all in one place.
          </h2>
          <p className="mt-3 text-sm md:text-base text-foreground-600 max-w-xl mx-auto">
            Connect all your messaging platforms in minutes. No technical skills required.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handlePlatformClick(platform.name)}
              className="group relative bg-background-100 rounded-xl p-5 md:p-6 text-center cursor-pointer transition-all duration-300 hover:bg-background-200/70 hover:-translate-y-1 w-full"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto flex items-center justify-center rounded-full bg-background-200/80 group-hover:bg-background-300 transition-colors">
                <i className={`${platform.icon} text-xl md:text-2xl`} style={{ color: platform.color }}></i>
              </div>
              <h3 className="mt-3 md:mt-4 font-heading text-sm md:text-base font-semibold text-foreground-900">
                {platform.name}
              </h3>
              <p className="mt-1.5 text-xs text-foreground-500 leading-relaxed line-clamp-2">
                {platform.description}
              </p>
              <div className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Set up now <i className="ri-arrow-right-line"></i>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-foreground-400">
            ...and more added every month. Need a specific integration?{" "}
            <a href="/contact" className="text-primary-500 hover:text-primary-600 font-medium cursor-pointer">
              Let us know.
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}