import { preloadImage } from "../../components/responsive-image/responsive-image";

export const HERO_IMAGE = "site/hero.jpg";
export const HERO_SIZES = "100vw";

export const preloadHeroImage = () =>
  preloadImage(HERO_IMAGE, HERO_SIZES, "high");
