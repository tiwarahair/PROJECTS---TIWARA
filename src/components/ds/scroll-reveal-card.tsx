import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import { prefersReducedMotion } from "../../utils/page-flags";
import styles from "../../styles/components/ds/scroll-reveal-card.module.css";

/**
 * Marketing hero device: a 3D-tilted ink-framed screen that rotates flat, scales up and
 * settles as the section scrolls past, while the headline above it lifts. Marketing pages only.
 */
export interface ScrollRevealCardProps {
  /** Headline block rendered above the frame; lifts as the card flattens */
  title?: ReactNode;
  /** Screenshot, photo or mock rendered inside the frame */
  children?: ReactNode;
  /** Freeze at a frame, 0 (fully tilted) to 1 (flat). Omit for scroll-driven behaviour. */
  progress?: number;
  /** Starting X rotation in degrees. Default 20 */
  tiltStart?: number;
  /** Starting scale on desktop. Default 1.05 */
  scaleStart?: number;
  /** Headline travel in px across the scroll. Default -100 */
  liftEnd?: number;
  /** Scroll-track height. Default 80rem desktop / 60rem mobile */
  height?: number | string;
  style?: CSSProperties;
  className?: string;
}

const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

export const ScrollRevealCard = ({
  title,
  children,
  progress,
  tiltStart = 20,
  scaleStart = 1.05,
  liftEnd = -100,
  height,
  style,
  className,
}: ScrollRevealCardProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isControlled = typeof progress === "number";
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isControlled) return;

    if (prefersReducedMotion()) {
      setScrollProgress(1);

      return;
    }

    let frame = 0;

    const handleScroll = () => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        const element = trackRef.current;

        if (!element) return;

        const rect = element.getBoundingClientRect();
        const span = rect.height - window.innerHeight;

        const next =
          span > 0
            ? -rect.top / span
            : (window.innerHeight - rect.top) /
              (window.innerHeight + rect.height);

        setScrollProgress(Math.min(1, Math.max(0, next)));
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);

      if (frame) cancelAnimationFrame(frame);
    };
  }, [isControlled]);

  const amount = isControlled ? progress : scrollProgress;
  const rotate = lerp(tiltStart, 0, amount);
  const scale = isMobile ? lerp(0.7, 0.9, amount) : lerp(scaleStart, 1, amount);
  const lift = lerp(0, liftEnd, amount);

  // scroll-driven transforms change every frame, so they are passed as custom properties
  const motionStyle = {
    "--reveal-rotate": `${rotate}deg`,
    "--reveal-scale": String(scale),
    "--reveal-lift": `${lift}px`,
    // falsy height (including 0) falls back to the default track height
    ...(height
      ? {
          "--reveal-height":
            typeof height === "number" ? `${height}px` : height,
        }
      : {}),
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={trackRef}
      className={joinClassNames(
        styles.track,
        isMobile && styles.mobile,
        className,
      )}
      style={motionStyle}
    >
      <div className={styles.stage}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.frame}>
          <div className={styles.screen}>{children}</div>
        </div>
      </div>
    </div>
  );
};
