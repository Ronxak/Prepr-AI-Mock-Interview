import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { FeatureSection } from "@/components/landing/feature-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="relative">
      <LandingNav />
      <Hero />
      <FeatureSection />
      <Footer />
    </main>
  );
}
