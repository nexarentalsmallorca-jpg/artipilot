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
    default: "Artipilot",
    template: "%s | Artipilot",
  },
  description: "Artipilot private WhatsApp dashboard.",
  metadataBase: new URL("https://artipilot.com"),
  alternates: {
    canonical: "https://artipilot.com",
  },
  robots: {
    index: false,
    follow: false,
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