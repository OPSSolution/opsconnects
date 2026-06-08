import { useState } from "react";
import { guideFAQ } from "@/mocks/guide";

export default function GuideFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-background-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-600 mb-3">
            Common Questions
          </p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-950 leading-tight">
            Setup & onboarding FAQ
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {guideFAQ.map((faq, index) => (
            <div
              key={index}
              className="bg-background-100 rounded-xl border border-background-200/70 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-5 md:px-6 py-4 cursor-pointer text-left"
              >
                <span className="text-sm md:text-base font-semibold text-foreground-900 pr-4">
                  {faq.question}
                </span>
                <span
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-full bg-background-200 transition-transform duration-300"
                  style={{ transform: openIndex === index ? "rotate(45deg)" : "rotate(0deg)" }}
                >
                  <i className="ri-add-line text-sm text-foreground-600"></i>
                </span>
              </button>
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  openIndex === index ? "max-h-96 pb-5 md:pb-6 px-5 md:px-6" : "max-h-0"
                }`}
              >
                <p className="text-sm text-foreground-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-foreground-500">
            Still have questions?{" "}
            <a href="#" className="text-primary-500 hover:text-primary-600 font-medium cursor-pointer">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}