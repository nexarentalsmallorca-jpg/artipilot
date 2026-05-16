import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Artipilot | AI WhatsApp Automation",
    template: "%s | Artipilot",
  },
  description:
    "Artipilot helps businesses automate WhatsApp replies, collect leads, manage conversations, and prepare AI customer support workflows.",
  keywords: [
    "Artipilot",
    "WhatsApp automation",
    "AI WhatsApp assistant",
    "WhatsApp Business automation",
    "AI customer support",
    "lead collection",
    "business automation",
  ],
  authors: [{ name: "Artipilot" }],
  creator: "Artipilot",
  publisher: "Artipilot",
  metadataBase: new URL("https://artipilot.com"),
  alternates: {
    canonical: "https://artipilot.com",
  },
  openGraph: {
    title: "Artipilot | AI WhatsApp Automation",
    description:
      "AI WhatsApp automation software for businesses that want faster replies, better lead collection, and smarter customer conversations.",
    url: "https://artipilot.com",
    siteName: "Artipilot",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Artipilot | AI WhatsApp Automation",
    description:
      "AI WhatsApp automation software for modern businesses.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    other: {
      "facebook-domain-verification": "9yzxy7zxosua494iz7ygf7t4zaw5oz",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}