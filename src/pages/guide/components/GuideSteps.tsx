import { useState } from "react";
import { guideSteps } from "@/mocks/guide";

export default function GuideSteps() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-background-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-3">
            Getting Started
          </p>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-950 leading-tight">
            Set up your platform in 5 easy steps
          </h2>
          <p className="mt-3 text-sm md:text-base text-foreground-600 max-w-lg mx-auto">
            Follow this guided setup and you'll be managing all your channels from one inbox in under 30 minutes.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {guideSteps.map((step, index) => (
                <button
                  key={step.step}
                  onClick={() => setActiveStep(index)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 whitespace-nowrap lg:whitespace-normal cursor-pointer flex-shrink-0 lg:flex-shrink ${
                    activeStep === index
                      ? "bg-primary-500 text-background-50 dark:text-foreground-950"
                      : "bg-background-100 text-foreground-700 hover:bg-background-200/70"
                  }`}
                >
                  <span
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                      activeStep === index
                        ? "bg-background-50/25 text-background-50 dark:text-foreground-950"
                        : "bg-background-200 text-foreground-500"
                    }`}
                  >
                    {step.step}
                  </span>
                  <span className="text-sm font-medium">{step.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-background-100 rounded-xl border border-background-200/70 p-6 md:p-8 min-h-[320px] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100">
                <i className={`${guideSteps[activeStep].icon} text-lg text-primary-600`}></i>
              </div>
              <div>
                <p className="text-xs text-foreground-400 font-medium">Step {guideSteps[activeStep].step} of {guideSteps.length}</p>
                <h3 className="font-heading text-lg md:text-xl font-bold text-foreground-950">
                  {guideSteps[activeStep].title}
                </h3>
              </div>
            </div>

            <p className="text-sm md:text-base text-foreground-600 leading-relaxed mb-6">
              {guideSteps[activeStep].description}
            </p>

            <ul className="space-y-3">
              {guideSteps[activeStep].details.map((detail, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-accent-100 flex-shrink-0 mt-0.5">
                    <i className="ri-check-line text-xs text-accent-600"></i>
                  </span>
                  <span className="text-sm text-foreground-700 leading-relaxed">{detail}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className={`text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeStep === 0
                    ? "text-foreground-300 cursor-not-allowed"
                    : "text-foreground-700 hover:text-foreground-950"
                }`}
              >
                <i className="ri-arrow-left-line"></i> Previous
              </button>

              <div className="flex gap-1">
                {guideSteps.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === activeStep ? "bg-primary-500" : "bg-background-300"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setActiveStep(Math.min(guideSteps.length - 1, activeStep + 1))}
                disabled={activeStep === guideSteps.length - 1}
                className={`text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeStep === guideSteps.length - 1
                    ? "text-foreground-300 cursor-not-allowed"
                    : "text-foreground-700 hover:text-foreground-950"
                }`}
              >
                Next <i className="ri-arrow-right-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}