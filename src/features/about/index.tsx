import { useRef } from "react";
import { StoryPage } from "../../components/story-page";
import { useStoryMotion } from "../../hooks/use-story-motion";
import { FindStylistSection, StatementSection } from "./closing-sections";
import { HeroSection, preloadAboutHero } from "./hero-section";
import { MissionSection } from "./mission-section";
import { buildAboutMotion } from "./motion";
import { StorySection } from "./story-section";
import { TeamSection } from "./team-section";

export const AboutPage = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useStoryMotion(rootRef, buildAboutMotion);
  preloadAboutHero();

  return (
    <StoryPage label="About" rootRef={rootRef}>
      <HeroSection />
      <MissionSection />
      <StorySection />
      <StatementSection />
      <TeamSection />
      <FindStylistSection />
    </StoryPage>
  );
};
