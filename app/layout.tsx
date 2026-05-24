import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://artipilot.com"),
  title: {
    default: "Artipilot | AI Daily Life Assistant",
    template: "%s | Artipilot",
  },
  description:
    "Capture anything. Organize everything. Act on what matters. Artipilot turns screenshots, notes, ideas, reminders, goals, links, products, places, and tasks into clear action cards.",
  applicationName: "Artipilot",
  keywords: [
    "Artipilot",
    "AI daily life assistant",
    "AI productivity app",
    "action inbox",
    "AI reminders",
    "AI notes organizer",
    "personal AI assistant",
    "PWA assistant",
  ],
  authors: [{ name: "Artipilot" }],
  creator: "Artipilot",
  publisher: "Artipilot",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Artipilot | AI Daily Life Assistant",
    description:
      "Turn screenshots, notes, ideas, reminders, and goals into clear actions.",
    url: "https://artipilot.com",
    siteName: "Artipilot",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Artipilot | AI Daily Life Assistant",
    description:
      "Capture anything. Organize everything. Act on what matters.",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}