import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { FavHost } from "../../components/fav-host/fav-host";
import { WelcomeToast } from "../../components/welcome-toast/welcome-toast";
import { useAppSelector } from "../../stores/hooks";
import { getAssetUrl } from "../../utils/asset-url";
import { prefersReducedMotion } from "../../utils/page-flags";
import { BookSlotTiles } from "./book-slot-tiles";
import { FaqSection } from "./faq-section";
import { ForStylistsSection } from "./for-stylists-section";
import { HeroSection } from "./hero-section";
import layout from "./home-layout.module.css";
import { HomeFooter } from "./home-footer";
import { HomeNav } from "./home-nav";
import page from "./home-page.module.css";
import { LooksSection } from "./looks-section";
import { MeetSection } from "./meet-section";
import { ProblemSection } from "./problem-section";
import { QuizStrip } from "./quiz-strip";
import { ServicesSection } from "./services-section";
import { StylesMarquee } from "./styles-marquee";
import { StylistsSection } from "./stylists-section";
import { useHomeMotion } from "./use-home-motion";
import { useNavMorph } from "./use-nav-morph";
import { WhySection } from "./why-section";

export interface HomePageProps {
  /** v1: The problem before the photo tiles · v2 (default): photo tiles first */
  order?: "v1" | "v2";
  stylistSection?: "photo" | "split";
  motion?: "full" | "reduced";
  showServices?: boolean;
  showWhy?: boolean;
}

const HOME_FONTS =
  "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..700&display=swap";

/** Marketing home page, route "/" (prototype Home.dc.html). Prop defaults are the prototype's data-props defaults. */
export const HomePage = ({
  order = "v2",
  stylistSection = "photo",
  motion = "full",
  showServices = false,
  showWhy = false,
}: HomePageProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = useAppSelector((state) => state.session.loggedIn);
  const morph = useNavMorph();
  const isMotionOn = motion !== "reduced" && !prefersReducedMotion();
  useHomeMotion(rootRef, isMotionOn, showWhy);
  preload(getAssetUrl("img/hero2.jpg"), { as: "image", fetchPriority: "high" });

  // page-wide helmet rules (body background, colour tokens, smooth scroll) apply while Home is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("home-page");
    if (!window.location.hash) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
    return () => document.documentElement.classList.remove("home-page");
  }, []);

  const toggleMenu = () => setMenuOpen((open) => !open);

  return (
    <div ref={rootRef} className={layout.page}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={HOME_FONTS} precedence="default" />
      <div
        id="morph"
        data-screen-label="Home"
        className={layout.morph}
        // --morph-bg: cream of the section in the middle of the viewport
        style={{ "--morph-bg": morph.morphBg } as CSSProperties}
      >
        <HomeNav
          morph={morph}
          loggedIn={loggedIn}
          menuOpen={menuOpen}
          onToggleMenu={toggleMenu}
        />
        <HeroSection />
        <StylesMarquee />
      </div>
      <div className={page.ordwrap} data-order={order === "v2" ? "v2" : "v1"}>
        <ProblemSection isMotionOn={isMotionOn} />
        <BookSlotTiles />
      </div>
      <StylistsSection />
      <div data-bg="#FAF6EE" className={layout.spacer}></div>
      <LooksSection isMotionOn={isMotionOn} />
      <QuizStrip />
      {showServices && <ServicesSection />}
      {showWhy && <WhySection />}
      <MeetSection />
      <ForStylistsSection variant={stylistSection} />
      <FaqSection />
      <HomeFooter />
      <WelcomeToast />
      <FavHost />
    </div>
  );
};
