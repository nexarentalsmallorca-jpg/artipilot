import Link from "next/link";
import { testimonials } from "@/lib/landingData";

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: {
    name: string;
    business: string;
    quote: string;
  };
  index: number;
}) {
  return (
    <div className="w-[285px] shrink-0 rounded-[1.6rem] border border-white/10 bg-[#080D18] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.35)] sm:w-[360px] sm:rounded-[2rem] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-sm font-black text-[#FFD166] sm:text-base">
              ★
            </span>
          ))}
        </div>

        <span className="rounded-full border border-[#36FF9F]/20 bg-[#103522] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#36FF9F] sm:text-xs">
          Verified
        </span>
      </div>

      <p className="min-h-[96px] text-base font-black leading-7 text-white sm:min-h-[120px] sm:text-lg sm:leading-8">
        “{testimonial.quote}”
      </p>

      <div className="mt-6 flex items-center gap-3 sm:mt-7 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#36FF9F] text-base font-black text-[#030509] sm:h-12 sm:w-12 sm:text-lg">
          {index + 1}
        </div>

        <div className="min-w-0">
          <p className="truncate font-black text-white">{testimonial.name}</p>
          <p className="mt-1 truncate text-xs text-[#A8B3C7] sm:text-sm">
            {testimonial.business}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const marqueeTestimonials = [...testimonials, ...testimonials];

  return (
    <section
      id="testimonials"
      className="relative flex min-h-screen items-center overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:min-h-0 lg:px-10 lg:py-24"
    >
      <div className="w-full">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-12">
            <div className="mb-4 inline-flex rounded-full border border-[#00D4FF]/25 bg-[#082333] px-4 py-2 text-xs font-black text-[#B9F6FF] sm:text-sm">
              Built for real businesses
            </div>

            <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Simple AI. More replies.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#A8B3C7] sm:text-base sm:leading-7">
              Artipilot helps your business answer faster, collect leads, and
              stay in control of every WhatsApp conversation.
            </p>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#030509] to-transparent sm:w-28" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#030509] to-transparent sm:w-28" />

          <div className="flex w-max gap-4 testimonial-marquee sm:gap-5">
            {marqueeTestimonials.map((testimonial, index) => (
              <TestimonialCard
                key={`${testimonial.name}-${index}`}
                testimonial={testimonial}
                index={index % testimonials.length}
              />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl sm:mt-10">
          <div className="grid grid-cols-2 gap-3 rounded-[1.6rem] border border-white/10 bg-[#070B14]/85 p-4 backdrop-blur-xl sm:gap-5 sm:rounded-[2rem] sm:p-6 lg:grid-cols-4">
            {[
              ["Instant", "first response"],
              ["Human", "takeover anytime"],
              ["Simple", "no-code setup"],
              ["Sales", "lead collection"],
            ].map(([top, bottom]) => (
              <div key={top} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center lg:border-0 lg:bg-transparent lg:p-0">
                <p className="bg-gradient-to-r from-white via-[#B9F6FF] to-[#36FF9F] bg-clip-text text-2xl font-black text-transparent sm:text-3xl">
                  {top}
                </p>
                <p className="mt-1 text-xs text-[#A8B3C7] sm:text-sm">
                  {bottom}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center lg:hidden">
            <Link
              href="/signup?offer=first-month-1eur"
              className="w-full max-w-sm rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-4 text-center text-sm font-black text-[#030509] shadow-[0_0_30px_rgba(54,255,159,0.22)]"
            >
              Start Artipilot for €1
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}