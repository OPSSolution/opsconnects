import { securityFeatures } from "@/mocks/homepage";

export default function SecuritySection() {
  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-background-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-600 mb-3">
            Enterprise Security
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground-950 leading-tight">
            Your data security is
            <br />
            our foundation.
          </h2>
          <p className="mt-3 text-sm md:text-base text-foreground-600 max-w-xl mx-auto">
            We're SOC 2 Type II certified with end-to-end encryption, granular access controls, and full regulatory compliance.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          {securityFeatures.map((feature) => (
            <div
              key={feature.label}
              className="bg-background-100 rounded-xl p-5 text-center transition-all duration-300 hover:bg-background-200/70"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100">
                <i className={`${feature.icon} text-lg md:text-xl text-secondary-600`}></i>
              </div>
              <p className="mt-3 text-xs md:text-sm font-medium text-foreground-800 leading-snug">
                {feature.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}