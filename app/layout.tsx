import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://private.artipilot.com"),
  title: {
    default: "Artipilot Private | NEXA WhatsApp Inbox",
    template: "%s | Artipilot Private",
  },
  description:
    "Private NEXA Rentals WhatsApp AI inbox for managing customer messages, AI replies, and bookings.",
  applicationName: "Artipilot Private",
  authors: [{ name: "Artipilot" }],
  creator: "Artipilot",
  publisher: "Artipilot",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "Artipilot Private | NEXA WhatsApp Inbox",
    description: "Private NEXA Rentals WhatsApp AI inbox.",
    url: "https://private.artipilot.com",
    siteName: "Artipilot Private",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Artipilot Private | NEXA WhatsApp Inbox",
    description: "Private NEXA Rentals WhatsApp AI inbox.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f0f2f5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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