import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BackgroundChats from "@/components/landing/BackgroundChats";

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030509] text-white">
      <BackgroundChats />

      <div className="relative z-10">
        <Navbar />

        <section className="px-4 py-20 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-10 lg:p-12">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex rounded-full border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-2 text-sm font-black text-[#36FF9F]">
                  Contact Artipilot
                </div>

                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Get in touch with our team
                </h1>

                <p className="mt-6 text-lg leading-8 text-[#C8D0E0]">
                  Have questions about Artipilot, WhatsApp Business automation,
                  pricing, onboarding, or your account? Contact us and our team
                  will reply as soon as possible.
                </p>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
                    Email
                  </p>
                  <p className="mt-3 text-xl font-black text-white">
                    support@artipilot.com
                  </p>
                  <p className="mt-3 leading-7 text-[#A8B3C7]">
                    For support, account questions, business enquiries and
                    onboarding help.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
                    Business
                  </p>
                  <p className="mt-3 text-xl font-black text-white">
                    Artipilot AI Automation
                  </p>
                  <p className="mt-3 leading-7 text-[#A8B3C7]">
                    AI WhatsApp automation software for businesses that want to
                    respond faster and manage conversations more efficiently.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
                    Response time
                  </p>
                  <p className="mt-3 text-xl font-black text-white">
                    Usually within 24–48 hours
                  </p>
                  <p className="mt-3 leading-7 text-[#A8B3C7]">
                    During launch and beta onboarding periods, response times
                    may vary depending on request volume.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#36FF9F]">
                    Legal pages
                  </p>
                  <p className="mt-3 text-xl font-black text-white">
                    Policies and company information
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                    <Link
                      href="/privacy-policy"
                      className="rounded-full border border-white/10 px-4 py-2 text-[#C8D0E0] transition hover:border-[#36FF9F]/40 hover:text-[#36FF9F]"
                    >
                      Privacy Policy
                    </Link>

                    <Link
                      href="/terms"
                      className="rounded-full border border-white/10 px-4 py-2 text-[#C8D0E0] transition hover:border-[#36FF9F]/40 hover:text-[#36FF9F]"
                    >
                      Terms
                    </Link>

                    <Link
                      href="/cancellation-policy"
                      className="rounded-full border border-white/10 px-4 py-2 text-[#C8D0E0] transition hover:border-[#36FF9F]/40 hover:text-[#36FF9F]"
                    >
                      Cancellation
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-3xl border border-[#00D4FF]/20 bg-[#00D4FF]/10 p-6">
                <p className="text-lg font-black text-white">
                  Important note
                </p>
                <p className="mt-3 leading-7 text-[#C8D0E0]">
                  Artipilot uses official business integrations and is designed
                  to help companies automate customer conversations responsibly.
                  Businesses remain responsible for their own customer data,
                  WhatsApp Business account, Meta account, and legal compliance.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}