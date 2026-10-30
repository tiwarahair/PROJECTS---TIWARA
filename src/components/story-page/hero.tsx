import { preloadImage, ResponsiveImage } from "../responsive-image";
import story from "../../styles/components/story-page/index.module.css";

const HERO_SIZES = "100vw";

interface HeroImageProps {
  id: string;
  src: string;
  alt: string;
  className?: string;
}

interface HeroTitleProps {
  lines: string[];
  className?: string;
}

export const preloadHeroImage = (src: string) =>
  preloadImage(src, HERO_SIZES, "high");

export const HeroImage = ({ id, src, alt, className }: HeroImageProps) => (
  <ResponsiveImage
    id={id}
    src={src}
    sizes={HERO_SIZES}
    loading="eager"
    fetchPriority="high"
    alt={alt}
    className={className}
  />
);

export const HeroTitle = ({ lines, className }: HeroTitleProps) => (
  <h1 className={className}>
    {lines.map((line) => (
      <span key={line} className={story.lineMask}>
        <span data-line="" className={story.line}>
          {line}
        </span>
      </span>
    ))}
  </h1>
);
