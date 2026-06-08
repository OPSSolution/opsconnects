export default function CTASection() {
  return (
    <section className="relative py-20 md:py-28 px-4 md:px-6 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Warm%20abstract%20gradient%20background%20with%20soft%20flowing%20curves%2C%20orange%20and%20cream%20tones%20blending%20organically%2C%20minimalist%20modern%20design%2C%20light%20airy%20atmosphere%20with%20subtle%20texture%2C%20clean%20professional%20aesthetic%2C%20high%20quality%20digital%20art%20render%20with%20gentle%20color%20transitions%2C%20abstract%20connective%20node%20patterns%20faintly%20visible%20in%20the%20background&width=1920&height=600&seq=cta-bg-v2&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-background-50 leading-tight">
          Ready to transform your
          <br />
          customer experience?
        </h2>
        <p className="mt-4 text-sm md:text-base text-background-50/70 leading-relaxed">
          Join 10,000+ businesses already using OmniConnect to unify their messaging and delight customers at every touchpoint.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#"
            className="text-sm font-semibold bg-background-50 text-foreground-950 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer px-8 py-3.5 rounded-md"
          >
            Start Free Trial
          </a>
          <a
            href="#"
            className="text-sm font-medium text-background-50/90 hover:text-background-50 transition-colors whitespace-nowrap cursor-pointer px-8 py-3.5 rounded-md border border-background-50/30"
          >
            Talk to Sales
          </a>
        </div>
        <p className="mt-5 text-xs text-background-50/50">
          No credit card required. 14-day free trial with full access.
        </p>
      </div>
    </section>
  );
}