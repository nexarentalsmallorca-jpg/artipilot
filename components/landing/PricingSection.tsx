import Link from "next/link";
import { pricingPlans } from "@/lib/landingData";

function getPlanSlug(planName: string) {
  return planName.toLowerCase().replace(/\s+/g, "-");
}

function getNumericPrice(price: string) {
  return price.replace(/[^\d]/g, "");
}

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative flex min-h-screen items-center px-4 py-14 sm:px-6 sm:py-20 lg:min-h-0 lg:px-10 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-12">
          <div className="mb-4 inline-flex rounded-full border border-[#36FF9F]/25 bg-[#103522] px-4 py-2 text-xs font-black text-[#36FF9F] sm:text-sm">
            Start for €1. Try it for a full month.
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Choose your plan.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#A8B3C7] sm:text-base sm:leading-7">
            Pay only €1 for your first month. After that, your selected monthly
            plan continues automatically. Cancel anytime before renewal.
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-3.5 text-center text-sm font-black text-[#030509] shadow-[0_0_28px_rgba(54,255,159,0.18)] transition hover:scale-[1.02] sm:w-auto"
            >
              Start for €1
            </Link>

            <Link
              href="/dashboard"
              className="w-full rounded-full border border-white/15 bg-white/[0.055] px-6 py-3.5 text-center text-sm font-black text-white transition hover:border-[#00D4FF]/45 hover:bg-white/10 sm:w-auto lg:hidden"
            >
              Download mobile app
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {pricingPlans.map((plan) => {
            const planSlug = getPlanSlug(plan.name);
            const cleanPrice = getNumericPrice(plan.price);
            const isPopular =
              plan.popular ||
              plan.name.toLowerCase().includes("pro") ||
              cleanPrice === "49";

            return (
              <div
                key={plan.name}
                className={`group relative overflow-hidden rounded-[1.7rem] border p-5 transition duration-300 hover:-translate-y-1 sm:rounded-[2rem] sm:p-7 ${
                  isPopular
                    ? "order-first border-[#36FF9F]/45 bg-[#081A14] shadow-[0_0_70px_rgba(54,255,159,0.16)] lg:order-none lg:scale-[1.035]"
                    : "border-white/10 bg-[#080D18] hover:border-[#00D4FF]/25"
                }`}
              >
                <div
                  className={`absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl transition duration-300 group-hover:scale-125 ${
                    isPopular ? "bg-[#36FF9F]/14" : "bg-[#00D4FF]/8"
                  }`}
                />

                {isPopular && (
                  <div className="absolute left-5 top-5 rounded-full bg-gradient-to-r from-[#FF8A1F] to-[#FFD166] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#030509] sm:left-7 sm:top-7 sm:text-xs">
                    Most popular
                  </div>
                )}

                <div className={`relative ${isPopular ? "pt-12" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-white">
                        {plan.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#A8B3C7] sm:min-h-[56px]">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-[#050912] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                      First month
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <p className="bg-gradient-to-r from-white via-[#B9F6FF] to-[#36FF9F] bg-clip-text text-6xl font-black leading-none text-transparent">
                        €1
                      </p>

                      <div className="pb-1">
                        <p className="text-sm font-bold text-white">
                          for 30 days
                        </p>
                        <p className="text-xs text-[#657089]">
                          New accounts only
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                      <p className="text-sm font-black text-white">
                        Then {plan.price}/month
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#A8B3C7]">
                        Your subscription continues automatically after the
                        first month unless cancelled.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">
                      What you get
                    </p>

                    <ul className="mt-4 space-y-3">
                      {plan.features.slice(0, 5).map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-3 text-sm leading-6 text-[#C8D0E0]"
                        >
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#36FF9F]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/signup?plan=${planSlug}&offer=first-month-1eur`}
                    className={`mt-6 flex w-full items-center justify-center rounded-full px-5 py-4 text-sm font-black transition active:scale-[0.98] ${
                      isPopular
                        ? "bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] text-[#030509] shadow-[0_0_30px_rgba(54,255,159,0.22)] hover:scale-[1.02]"
                        : "bg-white text-[#030509] hover:bg-[#36FF9F]"
                    }`}
                  >
                    Start this plan for €1
                  </Link>

                  <p className="mt-4 text-center text-xs font-semibold text-[#657089]">
                    Card required. Cancel anytime before renewal.
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-[1.5rem] border border-white/10 bg-[#080D18]/80 p-5 text-center backdrop-blur-xl">
          <p className="text-sm font-black text-white">
            Built for mobile teams.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
            Use Artipilot from your phone like an app: check WhatsApp leads,
            reply to customers, and take over conversations anytime.
          </p>
        </div>
      </div>
    </section>
  );
}