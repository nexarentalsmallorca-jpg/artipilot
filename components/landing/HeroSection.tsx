"use client";

import { liveDemoChats } from "@/lib/landingData";
import { useEffect, useMemo, useRef, useState } from "react";

type DemoMessage = {
  role: "customer" | "ai";
  niche: string;
  text: string;
};

export default function HeroSection() {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const demoMessages = useMemo<DemoMessage[]>(() => {
    return liveDemoChats.flatMap((chat) => [
      {
        role: "customer" as const,
        niche: chat.niche,
        text: chat.customer,
      },
      {
        role: "ai" as const,
        niche: chat.niche,
        text: chat.ai,
      },
    ]);
  }, []);

  const [visibleCount, setVisibleCount] = useState(2);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!demoMessages.length) return;

    const nextMessage = demoMessages[visibleCount % demoMessages.length];
    const nextIsAi = nextMessage?.role === "ai";

    if (nextIsAi) {
      setIsTyping(true);

      const typingTimer = window.setTimeout(() => {
        setIsTyping(false);
        setVisibleCount((count) =>
          count >= demoMessages.length ? 2 : count + 1
        );
      }, 850);

      return () => window.clearTimeout(typingTimer);
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((count) => (count >= demoMessages.length ? 2 : count + 1));
    }, 1450);

    return () => window.clearTimeout(timer);
  }, [visibleCount, demoMessages]);

  useEffect(() => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visibleCount, isTyping]);

  const visibleMessages = demoMessages.slice(0, visibleCount);
  const currentNiche =
    visibleMessages[visibleMessages.length - 1]?.niche || "Business";

  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-7 sm:px-6 sm:pb-18 sm:pt-10 lg:px-10 lg:pb-24 lg:pt-14">
      <div className="pointer-events-none absolute left-1/2 top-12 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#00D4FF]/10 blur-[120px] lg:left-[30%]" />
      <div className="pointer-events-none absolute bottom-10 right-0 h-[420px] w-[420px] rounded-full bg-[#36FF9F]/10 blur-[130px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <div className="mb-5 inline-flex rounded-full border border-[#FF8A1F]/30 bg-[#FF8A1F]/10 px-4 py-2 text-xs font-black text-[#FFD166] shadow-[0_0_18px_rgba(255,138,31,0.10)] sm:text-sm">
            AI WhatsApp automation made simple
          </div>

          <h1 className="mx-auto max-w-4xl text-[3.05rem] font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:mx-0 lg:text-7xl xl:text-[5rem]">
            Stop losing customers in{" "}
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] bg-clip-text text-transparent">
              WhatsApp.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#C8D0E0] sm:text-lg sm:leading-8 lg:mx-0">
            Artipilot replies instantly, collects lead details, answers with
            precision, and lets your team take over anytime. No stress. No
            coding. More replies, more leads, more sales.
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4 lg:mx-0 lg:justify-start">
            <a
              href="#pricing"
              className="rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-8 py-4 text-center text-sm font-black text-[#030509] shadow-[0_0_28px_rgba(54,255,159,0.20)] transition hover:scale-[1.02] sm:text-base"
            >
              Start 3-day free trial
            </a>

            <a
              href="#pricing"
              className="rounded-full border border-white/15 bg-white/[0.055] px-8 py-4 text-center text-sm font-black text-white transition hover:border-[#00D4FF]/45 hover:bg-white/10 sm:text-base"
            >
              View plans
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#00D4FF]/12 via-[#36FF9F]/8 to-[#FF8A1F]/6 blur-2xl sm:-inset-4 sm:rounded-[2.5rem]" />

          <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.075] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.38)] sm:rounded-[2rem] sm:p-4">
            <div className="relative rounded-[1.35rem] border border-white/10 bg-[#070B18] p-4 sm:rounded-[1.5rem] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#A8B3C7] sm:text-sm">
                    Live WhatsApp AI demo
                  </p>
                  <p className="text-lg font-black text-white sm:text-xl">
                    Artipilot Inbox
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-[#36FF9F]/25 bg-[#36FF9F]/12 px-3 py-1 text-[11px] font-black text-[#36FF9F] sm:text-xs">
                  AI online
                </span>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-black/25 p-3 sm:rounded-[1.4rem] sm:p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD166] sm:text-xs">
                      {currentNiche}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#A8B3C7] sm:text-sm">
                      Customer asks. AI replies. Team stays in control.
                    </p>
                  </div>

                  <div className="mt-1 flex shrink-0 gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#00D4FF] sm:h-2.5 sm:w-2.5" />
                    <span className="h-2 w-2 rounded-full bg-[#36FF9F] sm:h-2.5 sm:w-2.5" />
                    <span className="h-2 w-2 rounded-full bg-[#FF8A1F] sm:h-2.5 sm:w-2.5" />
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="hero-chat-scroll h-[285px] overflow-y-auto pr-1 scroll-smooth sm:h-[300px]"
                >
                  <div className="flex min-h-full flex-col justify-end gap-3">
                    {visibleMessages.map((message, index) => {
                      const isAi = message.role === "ai";

                      return (
                        <div
                          key={`${message.role}-${message.text}-${index}`}
                          className={`animate-[messageIn_220ms_ease-out] ${
                            isAi
                              ? "ml-auto max-w-[90%] sm:max-w-[88%]"
                              : "mr-auto max-w-[88%] sm:max-w-[82%]"
                          }`}
                        >
                          <div
                            className={`rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 ${
                              isAi
                                ? "border-[#36FF9F]/20 bg-[#123C2D]"
                                : "border-[#00D4FF]/20 bg-[#092A3A]"
                            }`}
                          >
                            <p
                              className={`text-[11px] font-black sm:text-xs ${
                                isAi ? "text-[#36FF9F]" : "text-[#00D4FF]"
                              }`}
                            >
                              {isAi ? "Artipilot AI" : "Customer"}
                            </p>
                            <p
                              className={`mt-1 text-xs leading-5 sm:text-sm sm:leading-6 ${
                                isAi ? "text-[#E9FFF3]" : "text-[#E7FAFF]"
                              }`}
                            >
                              “{message.text}”
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {isTyping && (
                      <div className="ml-auto max-w-[90%] animate-[messageIn_200ms_ease-out] rounded-2xl border border-[#36FF9F]/20 bg-[#123C2D] px-3 py-2.5 sm:max-w-[88%] sm:px-4 sm:py-3">
                        <p className="text-[11px] font-black text-[#36FF9F] sm:text-xs">
                          Artipilot AI
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[#36FF9F]" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[#36FF9F] [animation-delay:120ms]" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[#36FF9F] [animation-delay:240ms]" />
                          <p className="ml-1 text-[11px] font-bold text-[#A8B3C7] sm:ml-2 sm:text-xs">
                            writing a human-like reply
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  ["Lead", "Captured"],
                  ["AI", "Replying"],
                  ["Team", "Can take over"],
                ].map(([top, bottom]) => (
                  <div
                    key={top}
                    className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
                  >
                    <p className="text-xs font-black text-white sm:text-sm">
                      {top}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-[#A8B3C7] sm:text-xs">
                      {bottom}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-black text-white">
                    Human takeover
                  </p>
                  <div className="h-7 w-12 shrink-0 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#36FF9F] p-1">
                    <div className="ml-auto h-5 w-5 rounded-full bg-[#040713]" />
                  </div>
                </div>

                <p className="mt-2 text-xs leading-5 text-[#A8B3C7]">
                  AI handles repetitive messages. Your team controls important
                  conversations anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}