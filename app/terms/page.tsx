import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BackgroundChats from "@/components/landing/BackgroundChats";

const sections = [
  {
    title: "1. Agreement to these Terms",
    body: [
      "These Terms & Conditions explain the rules for using Artipilot, including our website, account area, onboarding flow, AI WhatsApp automation tools, and related services.",
      "By accessing or using Artipilot, you agree to these Terms. If you do not agree, you should not use the website or platform.",
    ],
  },
  {
    title: "2. About Artipilot",
    body: [
      "Artipilot provides AI automation software for businesses that want to manage customer conversations, automate replies, collect leads, and improve response speed through WhatsApp Business and other supported communication tools.",
      "Artipilot is a software provider. We do not own or control your business, your customers, your Meta account, your WhatsApp Business account, or the content you provide to your customers.",
    ],
  },
  {
    title: "3. Account registration",
    body: [
      "To use certain parts of Artipilot, you may need to create an account or sign in using an approved authentication method such as Google login.",
      "You are responsible for keeping your account secure, protecting access to your email and login method, and making sure that only authorized people access your workspace.",
      "You agree to provide accurate information during signup and onboarding, including your business details, contact information, and setup information.",
    ],
  },
  {
    title: "4. Business responsibility",
    body: [
      "You are responsible for the information you add to Artipilot, including business details, FAQs, prices, policies, opening hours, rules, services, booking instructions, customer support instructions, and any other information used by your AI assistant.",
      "You are responsible for checking that automated replies are accurate, lawful, professional, and suitable for your customers.",
      "You must not use Artipilot to mislead customers, impersonate another business, send illegal content, spam users, or violate applicable laws or platform rules.",
    ],
  },
  {
    title: "5. WhatsApp Business and Meta",
    body: [
      "Some Artipilot features may require you to connect or configure a WhatsApp Business account, Meta Business account, phone number, or official Meta integration.",
      "You are responsible for complying with Meta, WhatsApp Business, and any other third-party platform rules, policies, verification requirements, messaging rules, template rules, and account requirements.",
      "Artipilot cannot guarantee approval by Meta, WhatsApp, or any third-party platform. Verification, account review, messaging limits, and platform access are controlled by the relevant third-party provider.",
    ],
  },
  {
    title: "6. AI-generated replies",
    body: [
      "Artipilot uses AI to help generate and automate customer replies. AI output may be incomplete, incorrect, delayed, or unsuitable in some cases.",
      "You should test your AI assistant before using it with real customers and monitor conversations regularly.",
      "You remain responsible for all messages sent to your customers through your business accounts, including messages generated or assisted by AI.",
    ],
  },
  {
    title: "7. Acceptable use",
    body: [
      "You agree not to use Artipilot for unlawful, harmful, abusive, deceptive, discriminatory, threatening, fraudulent, or spam-related activity.",
      "You must not upload or process unnecessary sensitive personal data, illegal content, malware, harmful code, or content that violates the rights of others.",
      "You must not attempt to reverse engineer, attack, overload, scrape, copy, resell, or misuse the platform.",
    ],
  },
  {
    title: "8. Plans, billing, and trials",
    body: [
      "Artipilot may offer free trials, beta access, paid plans, subscriptions, or custom pricing depending on availability.",
      "Plan features, usage limits, pricing, trial length, and billing conditions may change over time. Any active paid subscription terms will be shown during the checkout or billing process where applicable.",
      "If payment features are enabled, you agree to provide accurate billing information and authorize payment for the selected plan or service.",
    ],
  },
  {
    title: "9. Cancellation and refunds",
    body: [
      "Cancellation and refund rules are explained in our Cancellation Policy.",
      "You are responsible for cancelling any active subscription according to the process provided in your account area or by contacting support where account cancellation tools are not yet available.",
    ],
  },
  {
    title: "10. Data and privacy",
    body: [
      "Our handling of personal information and business data is explained in our Privacy Policy.",
      "By using Artipilot, you agree that we may process account data, business setup data, technical data, and conversation-related data as needed to provide and secure the service.",
    ],
  },
  {
    title: "11. Service availability",
    body: [
      "We aim to keep Artipilot available and reliable, but we do not guarantee that the service will always be uninterrupted, error-free, or available at all times.",
      "Service interruptions may happen due to maintenance, updates, technical issues, hosting providers, AI providers, payment providers, Meta, WhatsApp, internet providers, or other third-party systems.",
    ],
  },
  {
    title: "12. Third-party services",
    body: [
      "Artipilot may depend on third-party services for hosting, databases, authentication, payments, AI processing, email, analytics, Meta integrations, WhatsApp Business features, and other platform functions.",
      "We are not responsible for third-party service outages, policy changes, approval decisions, pricing changes, account restrictions, or technical issues outside our control.",
    ],
  },
  {
    title: "13. Intellectual property",
    body: [
      "Artipilot, including its website, branding, design, software, interface, workflows, and platform features, is owned by Artipilot or its licensors.",
      "You may not copy, reproduce, sell, distribute, or create competing services using Artipilot’s design, software, or proprietary materials without written permission.",
      "You retain responsibility for the business content you provide, such as FAQs, policies, pricing, product information, and customer support information.",
    ],
  },
  {
    title: "14. Limitation of liability",
    body: [
      "To the maximum extent permitted by law, Artipilot is not liable for indirect, incidental, special, consequential, or business losses, including loss of profits, lost sales, lost customers, data loss, account restrictions, or platform approval failures.",
      "Artipilot is provided as a software tool. You are responsible for how you use it, how your AI assistant is configured, and how your business communicates with customers.",
    ],
  },
  {
    title: "15. Suspension or termination",
    body: [
      "We may suspend or terminate access to Artipilot if we believe an account is being used in a harmful, unlawful, abusive, fraudulent, or policy-violating way.",
      "You may stop using Artipilot at any time. Some data may be retained where required for legal, security, billing, backup, or operational reasons.",
    ],
  },
  {
    title: "16. Changes to these Terms",
    body: [
      "We may update these Terms from time to time. When we make changes, we will update the date on this page.",
      "Continued use of Artipilot after changes means you accept the updated Terms.",
    ],
  },
];

export default function TermsPage() {
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
                  Terms & Conditions
                </div>

                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Artipilot Terms & Conditions
                </h1>

                <p className="mt-6 text-lg leading-8 text-[#C8D0E0]">
                  These Terms explain the rules for using Artipilot, our website,
                  account area, AI automation tools, and WhatsApp Business
                  automation features.
                </p>

                <p className="mt-4 text-sm font-semibold text-[#A8B3C7]">
                  Last updated: 10 May 2026
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
                  href="/privacy-policy"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Privacy Policy</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Learn how we handle personal and business data.
                  </p>
                </Link>

                <Link
                  href="/cancellation-policy"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Cancellation Policy</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Review trial, subscription, and refund rules.
                  </p>
                </Link>

                <Link
                  href="/contact"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Contact</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Contact us for account or business questions.
                  </p>
                </Link>
              </div>

              <p className="mt-8 text-sm leading-6 text-[#657089]">
                These Terms are provided for general website and SaaS use. They
                do not replace independent legal advice for your specific
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