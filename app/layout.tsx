import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artipilot",
  description: "Private WhatsApp AI dashboard",
  robots: { index: false, follow: false },
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
