import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { FavHost } from "../../components/fav-host/fav-host";
import { WelcomeToast } from "../../components/welcome-toast/welcome-toast";
import { useAppSelector } from "../../stores/hooks";
import { getAssetUrl } from "../../utils/asset-url";
import { BookSlotTiles } from "./book-slot-tiles";
import { FaqSection } from "./faq-section";
import { ForStylistsSection } from "./for-stylists-section";
import { HeroSection } from "./hero-section";
import layout from "../../styles/features/home/home-layout.module.css";
import { HomeFooter } from "./home-footer";
import { HomeNav } from "./home-nav";
import page from "../../styles/features/home/home-page.module.css";
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
  showServices?: boolean;
  showWhy?: boolean;
}

const HOME_FONTS =
  "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..700&display=swap";

/** Marketing home page, route "/". */
export const HomePage = ({
  order = "v2",
  stylistSection = "photo",
  showServices = false,
  showWhy = false,
}: HomePageProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = useAppSelector((state) => state.session.loggedIn);
  const morph = useNavMorph();

  useHomeMotion(rootRef, showWhy);

  const heroUrl = getAssetUrl("site/hero.jpg");

  // eslint-disable-next-line id-length -- React preload() option name
  preload(heroUrl, { as: "image", fetchPriority: "high" });

  // page-wide rules (body background, colour tokens, smooth scroll) apply while Home is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("home-page");
    const { hash } = window.location;

    if (!hash) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";

      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }

    // links like "/#stylegrid" from other pages: the router doesn't scroll to a hash, so jump to it here,
    // then re-align once in case images or fonts above it shifted the layout (unless the visitor has scrolled)
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    let realign = 0;

    if (target) {
      target.scrollIntoView({ behavior: "instant" });
      const landedAt = window.scrollY;

      realign = window.setTimeout(() => {
        if (window.scrollY === landedAt)
          target.scrollIntoView({ behavior: "instant" });
      }, 400);
    }

    return () => {
      window.clearTimeout(realign);
      document.documentElement.classList.remove("home-page");
    };
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
        style={{ "--morph-bg": morph.morphBackground } as CSSProperties}
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
        <ProblemSection />
        <BookSlotTiles />
      </div>
      <StylistsSection />
      <div data-bg="#FAF6EE" className={layout.spacer}></div>
      <LooksSection />
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
