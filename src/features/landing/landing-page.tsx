import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { Banner } from "./banner";
import { FeaturedStylists } from "./featured-stylists";
import { IntroSection } from "./intro-section";
import { ServicesGrid } from "./services-grid";
import { HowSection } from "./how-section";
import { IndividualServicesGrid } from "./individual-services-grid";
import { TestimonialsSection } from "./testimonials-section";
import { Book } from "./book";
import { ShopSection } from "./shop-section";
import { JoinPlatform } from "./join-platform";
import { AboutSection } from "./about-section";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <>
      <Header />
      <HeroSection />
      <Banner />
      <FeaturedStylists />
      <IntroSection />
      <ServicesGrid />
      <HowSection />
      <IndividualServicesGrid />
      <TestimonialsSection />
      <Book />
      <ShopSection />
      <JoinPlatform />
      <AboutSection />
      <Footer />
    </>
  );
}
