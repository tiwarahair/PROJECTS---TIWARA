import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { FeaturedStylists } from "./featured-stylists";
import { ServicesGrid } from "./services-grid";
import { QuizTeaser } from "./quiz-teaser";
import { IntroSection } from "./intro-section";
import { TestimonialsSection } from "./testimonials-section";
import { ShopSection } from "./shop-section";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <>
      <Header />
      <HeroSection />
      <FeaturedStylists />
      <ServicesGrid />
      <QuizTeaser />
      <IntroSection />
      <TestimonialsSection />
      <ShopSection />
      <Footer />
    </>
  );
}
