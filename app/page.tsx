import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artipilot",
  description: "Coming soon.",
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B141A] px-6 text-center text-[#E9EDEF]">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Artipilot</h1>
      <p className="mt-3 text-base text-[#8696A0] sm:text-lg">Coming soon.</p>
    </main>
  );
}
