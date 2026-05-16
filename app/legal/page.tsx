import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BackgroundChats from "@/components/landing/BackgroundChats";

const legalItems = [
  {
    label: "Website",
    value: "artipilot.ai",
  },
  {
    label: "Service",
    value: "AI WhatsApp automation software for businesses",
  },
  {
    label: "Contact",
    value: "support@artipilot.ai",
  },
  {
    label: "Business model",
    value:
      "Software-as-a-service platform for business automation, customer support, lead collection, and AI-assisted WhatsApp replies.",
  },
];

const sections = [
  {
    title: "1. Legal notice",
    body: [
      "This page provides general legal information about Artipilot, the website, and the software service offered through this domain.",
      "Artipilot is a business software platform designed to help businesses automate customer conversations, manage leads, and improve response speed using AI-powered WhatsApp automation.",
    ],
  },
  {
    title: "2. Website owner and contact",
    body: [
      "For business, support, privacy, billing, or legal enquiries, users can contact Artipilot through the official contact page or by email.",
      "If company registration details, tax details, or additional legal identification are required for a specific agreement, invoice, partnership, or compliance process, they can be provided where applicable through official communication channels.",
    ],
  },
  {
    title: "3. Purpose of the website",
    body: [
      "The purpose of this website is to present Artipilot, explain its AI WhatsApp automation features, provide pricing information, offer account access, and allow interested businesses to contact the team.",
      "The website may also provide access to onboarding, setup, dashboard features, legal policies, and product information.",
    ],
  },
  {
    title: "4. Software service",
    body: [
      "Artipilot provides software tools that help businesses configure AI assistants, automate replies, organize customer conversations, and prepare WhatsApp Business automation workflows.",
      "The service depends on user-provided business information and may also depend on third-party platforms such as hosting providers, database providers, authentication providers, AI providers, payment providers, Meta, and WhatsApp Business services.",
    ],
  },
  {
    title: "5. User responsibility",
    body: [
      "Businesses using Artipilot are responsible for the accuracy of the information they provide, the messages sent through their business accounts, and their compliance with applicable laws, privacy rules, advertising rules, and platform policies.",
      "Businesses must make sure they have the correct permission, consent, or legal basis to communicate with their customers and process customer data.",
    ],
  },
  {
    title: "6. Third-party platforms",
    body: [
      "Artipilot may integrate with or depend on third-party platforms, including Meta and WhatsApp Business.",
      "Artipilot does not control Meta verification decisions, WhatsApp Business approval, messaging limits, template approvals, account restrictions, platform policy changes, or third-party service interruptions.",
    ],
  },
  {
    title: "7. Intellectual property",
    body: [
      "The Artipilot name, brand, website design, user interface, software logic, workflows, and platform materials are protected intellectual property unless stated otherwise.",
      "Users may not copy, resell, reproduce, reverse engineer, or misuse Artipilot materials without written permission.",
    ],
  },
  {
    title: "8. External links",
    body: [
      "The website may contain links to third-party websites or services. These external services are provided for convenience and are not controlled by Artipilot.",
      "Users should review the terms and privacy policies of third-party services before using them.",
    ],
  },
  {
    title: "9. Policy pages",
    body: [
      "Users should read the Privacy Policy, Terms & Conditions, and Cancellation Policy before using the service.",
      "These pages explain how data is handled, how the platform can be used, and how subscription or cancellation requests are managed.",
    ],
  },
];

export default function LegalPage() {
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
                  Legal Information
                </div>

                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Artipilot Legal Information
                </h1>

                <p className="mt-6 text-lg leading-8 text-[#C8D0E0]">
                  This page provides legal and company-related information about
                  Artipilot, our website, and our AI WhatsApp automation
                  software.
                </p>

                <p className="mt-4 text-sm font-semibold text-[#A8B3C7]">
                  Last updated: 10 May 2026
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {legalItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-black/25 p-6"
                  >
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#36FF9F]">
                      {item.label}
                    </p>
                    <p className="mt-3 leading-7 text-[#C8D0E0]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-3xl border border-[#00D4FF]/20 bg-[#00D4FF]/10 p-6">
                <h2 className="text-xl font-black text-white">
                  Important business information
                </h2>

                <p className="mt-4 leading-7 text-[#C8D0E0]">
                  Artipilot is currently presented as an AI WhatsApp automation
                  software platform. Some features may be in beta, early access,
                  or active development. Users should review all policies and
                  contact Artipilot for specific business, billing, privacy, or
                  legal questions.
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

              <div className="mt-10 grid gap-4 sm:grid-cols-4">
                <Link
                  href="/contact"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Contact</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Contact our team.
                  </p>
                </Link>

                <Link
                  href="/privacy-policy"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Privacy</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Data handling policy.
                  </p>
                </Link>

                <Link
                  href="/terms"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Terms</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Platform rules.
                  </p>
                </Link>

                <Link
                  href="/cancellation-policy"
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:border-[#36FF9F]/30 hover:bg-black/35"
                >
                  <p className="font-black text-white">Cancellation</p>
                  <p className="mt-2 text-sm leading-6 text-[#A8B3C7]">
                    Refund rules.
                  </p>
                </Link>
              </div>

              <p className="mt-8 text-sm leading-6 text-[#657089]">
                This page is general legal information for the Artipilot website
                and SaaS platform. It does not replace independent legal advice
                for your specific business, country, or compliance obligations.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}