import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import BackgroundChats from "@/components/landing/BackgroundChats";

const sections = [
  {
    title: "1. Introduction",
    body: [
      "This Privacy Policy explains how Artipilot collects, uses, stores, and protects personal information when you visit our website, create an account, use our software, or contact us.",
      "Artipilot provides AI WhatsApp automation software for businesses. Our platform helps businesses manage customer conversations, prepare AI assistants, and improve response times.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "We may collect information that you provide directly, including your name, email address, business name, business type, phone number, account details, setup information, and any information you submit through our forms or onboarding process.",
      "When you use our platform, we may process business configuration data such as FAQs, prices, rules, services, opening hours, AI instructions, WhatsApp setup details, and customer support preferences.",
      "We may also collect technical information such as IP address, browser type, device information, pages visited, login activity, and basic usage data to keep the service secure and improve performance.",
    ],
  },
  {
    title: "3. WhatsApp and customer conversation data",
    body: [
      "If a business connects WhatsApp Business or uses WhatsApp automation features, Artipilot may process messages, customer enquiries, contact details, media, and conversation history only as necessary to provide the automation service.",
      "Businesses using Artipilot are responsible for having the proper legal basis, permissions, notices, and customer consent required to process their own customer data.",
      "Artipilot does not sell WhatsApp conversation data. Conversation data is used to provide, maintain, secure, and improve the service.",
    ],
  },
  {
    title: "4. How we use information",
    body: [
      "We use collected information to create and manage accounts, provide access to the platform, operate AI automation features, personalize workspace setup, provide support, improve security, prevent abuse, process billing where applicable, and communicate important service updates.",
      "We may use business setup information to help configure AI assistants so they can answer customer questions according to the information provided by the business.",
    ],
  },
  {
    title: "5. Third-party services",
    body: [
      "Artipilot may use trusted third-party services to operate the platform, including hosting providers, authentication providers, database providers, payment processors, AI providers, analytics tools, email providers, and official Meta or WhatsApp Business integrations.",
      "These providers only receive the information necessary to perform their services and are expected to handle data securely according to their own privacy and security obligations.",
    ],
  },
  {
    title: "6. AI processing",
    body: [
      "Artipilot uses artificial intelligence to help businesses generate and automate replies. AI-generated replies may not always be perfect, so businesses should review their configuration, test their assistant, and monitor conversations regularly.",
      "Businesses remain responsible for the accuracy of information provided to their customers through the platform and for ensuring their use of AI automation complies with applicable laws and platform rules.",
    ],
  },
  {
    title: "7. Data storage and security",
    body: [
      "We use reasonable technical and organizational measures to protect personal information from unauthorized access, loss, misuse, alteration, or disclosure.",
      "No online service can guarantee absolute security. Businesses should protect their login details, manage user access carefully, and avoid uploading unnecessary sensitive information.",
    ],
  },
  {
    title: "8. Data retention",
    body: [
      "We keep personal information only for as long as necessary to provide the service, comply with legal obligations, resolve disputes, maintain security, and enforce our agreements.",
      "Businesses may contact us to request deletion of account data, subject to legal, security, backup, billing, or operational retention requirements.",
    ],
  },
  {
    title: "9. Your rights",
    body: [
      "Depending on your location, you may have rights to access, correct, delete, restrict, or object to the processing of your personal information.",
      "You may also have the right to request a copy of your data or withdraw consent where processing is based on consent. To make a request, contact us using the details on our Contact page.",
    ],
  },
  {
    title: "10. Cookies and tracking",
    body: [
      "Artipilot may use cookies or similar technologies to keep users logged in, improve website performance, analyze usage, and protect the platform from abuse.",
      "You can control cookies through your browser settings, but disabling some cookies may affect website or account functionality.",
    ],
  },
  {
    title: "11. Children",
    body: [
      "Artipilot is intended for business users and is not designed for children. We do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "12. Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. When we make changes, we will update the date on this page. Continued use of Artipilot after changes means you accept the updated policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
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
                  Privacy Policy
                </div>

                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Artipilot Privacy Policy
                </h1>

                <p className="mt-6 text-lg leading-8 text-[#C8D0E0]">
                  This page explains how Artipilot handles personal information,
                  business data, and WhatsApp automation data.
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

              <div className="mt-10 rounded-3xl border border-[#00D4FF]/20 bg-[#00D4FF]/10 p-6">
                <h2 className="text-xl font-black text-white">
                  Contact about privacy
                </h2>

                <p className="mt-4 leading-7 text-[#C8D0E0]">
                  For privacy questions, data requests, or account-related
                  enquiries, please contact us through our contact page.
                </p>

                <Link
                  href="/contact"
                  className="mt-5 inline-flex rounded-full bg-gradient-to-r from-[#00D4FF] via-[#36FF9F] to-[#A7FFCB] px-6 py-3 text-sm font-black text-[#030509] transition hover:scale-[1.03]"
                >
                  Contact Artipilot
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