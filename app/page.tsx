import BackgroundChats from "@/components/landing/BackgroundChats";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/HeroSection";
import Navbar from "@/components/landing/Navbar";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";

export default function Home() {
  return (
    <main className="relative h-screen overflow-y-auto overflow-x-hidden scroll-smooth bg-[#030509] text-white [scroll-snap-type:y_mandatory] lg:h-auto lg:min-h-screen lg:overflow-hidden lg:[scroll-snap-type:none]">
      <BackgroundChats />

      <div className="relative z-10">
        <div className="sticky top-0 z-50 bg-[#030509]/75 pb-2 backdrop-blur-xl lg:static lg:bg-transparent lg:pb-0 lg:backdrop-blur-0">
          <Navbar />
        </div>

        <section className="min-h-[calc(100svh-92px)] scroll-mt-24 snap-start snap-always lg:min-h-0 lg:snap-align-none">
          <HeroSection />
        </section>

        <section className="min-h-screen scroll-mt-24 snap-start snap-always lg:min-h-0 lg:snap-align-none">
          <PricingSection />
        </section>

        <section className="min-h-screen scroll-mt-24 snap-start snap-always lg:min-h-0 lg:snap-align-none">
          <TestimonialsSection />
        </section>

        <section className="scroll-mt-24 snap-start snap-always lg:snap-align-none">
          <Footer />
        </section>
      </div>
    </main>
  );
}