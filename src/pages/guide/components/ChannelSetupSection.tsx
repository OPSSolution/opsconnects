import { channelSetupGuides } from "@/mocks/guide";

export default function ChannelSetupSection() {
  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-background-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-500 mb-3">
            Channel Setup
          </p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-950 leading-tight">
            Connect each channel in minutes
          </h2>
          <p className="mt-3 text-sm md:text-base text-foreground-600 max-w-lg mx-auto">
            Every channel comes with a guided setup wizard. Here's what to expect for each platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {channelSetupGuides.map((channel) => (
            <div
              key={channel.name}
              className="group bg-background-50 rounded-xl p-5 border border-background-200/70 transition-all duration-300 hover:border-primary-300 cursor-pointer"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-background-200/80 group-hover:bg-background-300 transition-colors">
                <i className={`${channel.icon} text-lg text-foreground-700`}></i>
              </div>
              <h3 className="mt-3 font-heading text-sm font-semibold text-foreground-900">
                {channel.name}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-foreground-500">
                <span className="flex items-center gap-1">
                  <i className="ri-time-line"></i> {channel.time}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  channel.difficulty === "Easy"
                    ? "bg-accent-100 text-accent-700"
                    : "bg-secondary-100 text-secondary-700"
                }`}>
                  {channel.difficulty}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-500 group-hover:text-primary-600 transition-colors">
                View setup guide <i className="ri-arrow-right-line"></i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}