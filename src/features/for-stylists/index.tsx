import { useRef } from "react";
import { StoryPage } from "../../components/story-page";
import { useStoryMotion } from "../../hooks/use-story-motion";
import { BenefitsSection } from "./benefits-section";
import { ListBusinessSection, StatementSection } from "./closing-sections";
import { HeroSection, preloadForStylistsHero } from "./hero-section";
import { buildForStylistsMotion } from "./motion";

export const ForStylistsPage = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useStoryMotion(rootRef, buildForStylistsMotion);
  preloadForStylistsHero();

  return (
    <StoryPage label="For stylists" rootRef={rootRef}>
      <HeroSection />
      <BenefitsSection />
      <StatementSection />
      <ListBusinessSection />
    </StoryPage>
  );
};
