"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [hiddenOnMobile, setHiddenOnMobile] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth < 768;

      if (!isMobile) {
        setHiddenOnMobile(false);
        return;
      }

      if (currentScrollY < 20) {
        setHiddenOnMobile(false);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY && currentScrollY > 90) {
        setHiddenOnMobile(true);
      } else {
        setHiddenOnMobile(false);
      }

      lastScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 px-3 pt-3 transition-transform duration-300 sm:px-6 lg:px-10 lg:pt-4 ${
        hiddenOnMobile ? "-translate-y-full md:translate-y-0" : "translate-y-0"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.35rem] border border-white/10 bg-[#07101B]/88 px-3 py-3 shadow-[0_18px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:rounded-3xl sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_28px_rgba(54,255,159,0.18)] sm:h-12 sm:w-12">
            <Image
              src="/artipilot-logo.png"
              alt="Artipilot logo"
              width={44}
              height={44}
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-black leading-none text-white sm:text-lg">
              Artipilot
            </p>
            <p className="mt-1 hidden text-xs font-medium text-[#A8B3C7] min-[380px]:block">
              WhatsApp AI assistant
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold text-[#A8B3C7] md:flex">
          <Link href="/#pricing" className="transition hover:text-[#36FF9F]">
            Pricing
          </Link>

          <Link
            href="/#testimonials"
            className="transition hover:text-[#36FF9F]"
          >
            Reviews
          </Link>

          <Link href="/contact" className="transition hover:text-[#36FF9F]">
            Contact
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-black text-white transition hover:border-[#00D4FF]/40 hover:bg-white/[0.08] sm:px-5 sm:text-sm"
          >
            Login
          </Link>

          <Link
            href="/signup?offer=first-month-1eur&plan=growth"
            className="rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-4 py-2.5 text-xs font-black text-[#030509] shadow-[0_0_30px_rgba(54,255,159,0.22)] transition hover:scale-[1.03] sm:px-5 sm:text-sm"
          >
            <span className="hidden sm:inline">Start for €1</span>
            <span className="sm:hidden">Start</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto mt-2 hidden max-w-7xl rounded-2xl border border-[#36FF9F]/15 bg-[#07101B]/70 px-4 py-2 text-center text-xs font-semibold text-[#A8B3C7] backdrop-blur-xl md:block">
        Beta access is open while Meta and WhatsApp Business approval is being
        completed.
      </div>
    </header>
  );
}