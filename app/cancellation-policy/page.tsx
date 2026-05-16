import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BackgroundChats from "@/components/landing/BackgroundChats";

const sections = [
  {
    title: "1. Overview",
    body: [
      "This Cancellation Policy explains how cancellations, refunds, free trials, subscriptions, and account changes work for Artipilot.",
      "Artipilot provides AI WhatsApp automation software for businesses. Some features may be offered through free trial access, beta access, paid subscriptions, or custom plans.",
    ],
  },
  {
    title: "2. Free trial",
    body: [
      "Artipilot may offer a free trial for selected plans or users. The free trial period, available features, and usage limits may vary depending on the plan or launch period.",
      "If a free trial is offered, you can test the platform during the trial period before activating a paid subscription, unless stated otherwise during signup or checkout.",
    ],
  },
  {
    title: "3. Subscription cancellation",
    body: [
      "You may cancel your subscription at any time through your account area when cancellation tools are available, or by contacting Artipilot support.",
      "Cancelling a subscription stops future renewals. It does not automatically refund payments that have already been processed unless required by law or clearly stated in a separate written agreement.",
      "After cancellation, your access may continue until the end of the current paid billing period, unless your account is cancelled during a trial or suspended for misuse.",
    ],
  },
  {
    title: "4. Refunds",
    body: [
      "Payments for software subscriptions are generally non-refundable once a billing period has started, because access to the digital service is provided immediately.",
      "Refund requests may be reviewed on a case-by-case basis, especially where there has been a duplicate charge, technical billing error, or other exceptional issue.",
      "Refund approval is not guaranteed unless required by applicable consumer protection law or confirmed by Artipilot in writing.",
    ],
  },
  {
    title: "5. Trial cancellation before billing",
    body: [
      "If your free trial requires payment details, you must cancel before the trial ends to avoid being charged for the selected plan.",
      "If no payment method has been added during the trial, your account may simply remain limited, inactive, or require plan activation after the trial period.",
    ],
  },
  {
    title: "6. Plan changes",
    body: [
      "You may be able to upgrade, downgrade, or change your plan depending on available billing features.",
      "Plan changes may affect available features, limits, billing amount, and access to certain automation tools.",
      "If billing is already active, plan changes may be applied immediately, at the next billing cycle, or according to the payment provider’s billing rules.",
    ],
  },
  {
    title: "7. Beta access and early access",
    body: [
      "During beta or early access periods, some features may still be under development, limited, or changed as the product improves.",
      "Beta access does not guarantee that every planned feature will be available immediately. Artipilot may update, remove, replace, or improve beta features at any time.",
    ],
  },
  {
    title: "8. Account deletion",
    body: [
      "You may request account deletion by contacting Artipilot support.",
      "Some information may be retained where necessary for legal, security, billing, tax, fraud prevention, backup, or operational reasons.",
      "Deleting your account may permanently remove access to your workspace, setup information, AI configuration, and conversation history stored in Artipilot.",
    ],
  },
  {
    title: "9. WhatsApp, Meta, and third-party services",
    body: [
      "Artipilot cannot guarantee approval, continued access, or uninterrupted service from Meta, WhatsApp Business, payment providers, AI providers, hosting providers, or other third-party services.",
      "Refunds are not automatically provided because of third-party approval delays, Meta verification issues, WhatsApp restrictions, messaging limits, or policy decisions outside Artipilot’s control.",
      "Businesses are responsible for keeping their Meta Business account, WhatsApp Business account, and connected services compliant with third-party rules.",
    ],
  },
  {
    title: "10. Cancellation support",
    body: [
      "If you need help cancelling a subscription, changing a plan, deleting an account, or asking about a billing issue, contact Artipilot through the contact page.",
      "Please include your account email, business name, and a clear explanation of the request so we can help faster.",
    ],
  },
  {
    title: "11. Changes to this policy",
    body: [
      "We may update this Cancellation Policy from time to time. When we make changes, we will update the date on this page.",
      "Continued use of Artipilot after changes means you accept the updated policy.",
    ],
  },
];

export default function CancellationPolicyPage() {
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
                  Cancellation Policy
                </div>

                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Artipilot Cancellation Policy
                </h1>

                <p className="mt-6 text-lg leading-8 text-[#C8D0E0]">
                  This policy explains how cancellations, refunds, trials,
                  subscriptions, and account closure requests are handled for
                  Artipilot.
                </p>

                <p className="mt-4 text-sm font-semibold text-[#A8B3C7]">
                  Last updated: 10 May 2026
                </p>
              </div>

              <div className="mt-10 rounded-3xl border border-[#36FF9F]/20 bg-[#36FF9F]/10 p-6">
                <h2 className="text-xl font-black text-white">
                  Simple summary
                </h2>

                <p className="mt-4 leading-7 text-[#C8D0E0]">
                  You can cancel future renewals. Paid software subscription
                  periods are normally not refunded once access has started,
                  unless there is a billing mistake, exceptional issue, or a
                  legal requirement.
                </p>
              </div>

              <div className="mt-10 space-y-6">
                {sections.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-3xl border border-white/10 bg-black/25 p-6"
                  >
                    <h2 className="text-xl font-black text-white">
                      {section.title}
                    </h2>

                    <div className="mt-4 space-y-4">
                      {section.body.map((paragraph) => (
                        <p
                          key={paragraph}
                          className="leading-7 text-[#C8D0E0]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <Link
                  href="/terms"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Terms</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Read the full terms for using Artipilot.
                  </p>
                </Link>

                <Link
                  href="/privacy-policy"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Privacy Policy</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Learn how account and business data is handled.
                  </p>
                </Link>

                <Link
                  href="/contact"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Contact</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Contact us for billing or cancellation help.
                  </p>
                </Link>
              </div>

              <p className="mt-8 text-sm leading-6 text-[#657089]">
                This policy is provided for general website and SaaS use. It
                does not replace independent legal advice for your specific
                business, location, or compliance obligations.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}