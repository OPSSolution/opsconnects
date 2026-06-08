import { testimonials } from "@/mocks/homepage";

export default function TestimonialsSection() {
  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-background-100">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-3">
            Testimonials
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground-950 leading-tight">
            Trusted by customer-focused
            <br />
            teams worldwide.
          </h2>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="break-inside-avoid mb-4 md:mb-5 bg-background-50 rounded-xl p-5 md:p-6 border border-background-200/70"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden bg-background-200 flex-shrink-0">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground-900">{t.name}</p>
                  <p className="text-xs text-foreground-500">
                    {t.role}, {t.company}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-foreground-700 leading-relaxed">
                &ldquo;{t.content}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}