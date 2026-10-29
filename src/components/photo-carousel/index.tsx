import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveImage } from "../responsive-image";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/photo-carousel/index.module.css";

interface PhotoCarouselProps {
  photos: string[];
  sizes: string;
  label?: string;
  labelClassName?: string;
  className?: string;
}

export const PhotoCarousel = ({
  photos,
  sizes,
  label,
  labelClassName,
  className,
}: PhotoCarouselProps) => {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const hasMany = photos.length > 1;

  const goTo = (index: number) => {
    const element = track.current;

    if (!element) return;

    element.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  };

  const step = (delta: number) => (event: MouseEvent) => {
    event.stopPropagation();
    goTo((current + delta + photos.length) % photos.length);
  };

  return (
    <div
      className={joinClassNames(styles.carousel, className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={label ? `${label} photos` : "Photos"}
    >
      <div
        ref={track}
        className={styles.track}
        onScroll={({ currentTarget: { scrollLeft, clientWidth } }) =>
          setCurrent(Math.round(scrollLeft / Math.max(clientWidth, 1)))
        }
      >
        {photos.map((src, index) => (
          <ResponsiveImage
            key={src}
            className={styles.photo}
            src={src}
            sizes={sizes}
            alt={label ? `${label}, photo ${index + 1}` : `Photo ${index + 1}`}
          />
        ))}
      </div>
      {label && (
        <span className={joinClassNames(styles.label, labelClassName)}>
          {label}
        </span>
      )}
      {hasMany && (
        <>
          <button
            type="button"
            className={joinClassNames(styles.arrow, styles.prev)}
            onClick={step(-1)}
            aria-label="Previous photo"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={joinClassNames(styles.arrow, styles.next)}
            onClick={step(1)}
            aria-label="Next photo"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </>
      )}
      {hasMany && (
        <div className={styles.dots} aria-hidden="true">
          {photos.map((src, index) => (
            <span
              key={src}
              className={joinClassNames(
                styles.dot,
                index === current && styles.dotOn,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};
