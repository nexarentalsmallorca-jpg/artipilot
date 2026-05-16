import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      id="footer"
      className="relative flex min-h-[78vh] items-center px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16 lg:min-h-0 lg:px-10 lg:pb-8 lg:pt-24"
    >
      <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.055] shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:rounded-[2rem]">
        <div className="relative p-6 sm:p-10 lg:p-12">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#00D4FF]/12 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-[#36FF9F]/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:gap-10">
            <div>
              <Link href="/" className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_28px_rgba(54,255,159,0.18)]">
                  <Image
                    src="/artipilot-logo.png"
                    alt="Artipilot logo"
                    width={44}
                    height={44}
                    className="h-10 w-10 object-contain"
                  />
                </div>

                <div>
                  <p className="text-lg font-black leading-none text-white">
                    Artipilot
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#A8B3C7]">
                    AI WhatsApp Automation
                  </p>
                </div>
              </Link>

              <p className="mt-5 max-w-md text-sm leading-6 text-[#C8D0E0] sm:mt-6 sm:text-base sm:leading-7">
                Automate WhatsApp replies, collect leads, manage conversations,
                and let your team take over anytime.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-7">
                <Link
                  href="/signup?offer=first-month-1eur"
                  className="rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-3.5 text-center text-sm font-black text-[#030509] shadow-[0_0_30px_rgba(54,255,159,0.18)] transition hover:scale-[1.02]"
                >
                  Start for €1
                </Link>

                <Link
                  href="/contact"
                  className="rounded-full border border-white/15 bg-white/[0.055] px-6 py-3.5 text-center text-sm font-black text-white transition hover:border-[#00D4FF]/45 hover:bg-white/10"
                >
                  Contact us
                </Link>
              </div>

              <div className="mt-5 inline-flex rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-xs font-black text-[#36FF9F] sm:text-sm">
                Built for real business conversations
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-3 lg:gap-10">
              <div>
                <p className="font-black text-white">Product</p>

                <div className="mt-4 space-y-3 text-sm font-semibold text-[#A8B3C7] sm:mt-5">
                  <Link
                    href="/#pricing"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Pricing
                  </Link>

                  <Link
                    href="/#testimonials"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Reviews
                  </Link>

                  <Link
                    href="/dashboard"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Mobile app
                  </Link>
                </div>
              </div>

              <div>
                <p className="font-black text-white">Use cases</p>

                <div className="mt-4 space-y-3 text-sm font-semibold text-[#A8B3C7] sm:mt-5">
                  <Link
                    href="/#pricing"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Rentals
                  </Link>

                  <Link
                    href="/#pricing"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Restaurants
                  </Link>

                  <Link
                    href="/#pricing"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Hotels
                  </Link>

                  <Link
                    href="/#pricing"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Services
                  </Link>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <p className="font-black text-white">Company</p>

                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-semibold text-[#A8B3C7] sm:mt-5 sm:block sm:space-y-3">
                  <Link
                    href="/signup"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup?offer=first-month-1eur"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Start for €1
                  </Link>

                  <Link
                    href="/contact"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Contact
                  </Link>

                  <Link
                    href="/legal"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Legal
                  </Link>

                  <Link
                    href="/privacy-policy"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Privacy
                  </Link>

                  <Link
                    href="/terms"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Terms
                  </Link>

                  <Link
                    href="/cancellation-policy"
                    className="block transition hover:text-[#36FF9F]"
                  >
                    Cancellation
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-8 border-t border-white/10 pt-5 sm:mt-10 sm:pt-6 lg:mt-12">
            <div className="flex flex-col justify-between gap-3 text-xs leading-5 text-[#A8B3C7] sm:text-sm md:flex-row md:items-center">
              <p>© 2026 Artipilot. All rights reserved.</p>

              <p>
                AI WhatsApp automation, customer support and lead collection for
                modern businesses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}