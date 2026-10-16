import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { resolveAssetUrl } from "../../utils/asset-url";
import styles from "../../styles/features/stylist-profile/portfolio-lightbox.module.css";
import pageGlobal from "../../styles/features/stylist-profile/stylist-profile-page-global.module.css";

interface PortfolioLightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Full-screen photo viewer: arrows / keys / swipe step through the gallery, the scrim closes it. */
export const PortfolioLightbox = ({
  photos,
  index,
  onIndexChange,
  onClose,
}: PortfolioLightboxProps) => {
  const touchStartX = useRef<number | null>(null);
  const src = photos[index] ?? "";

  const step = (delta: number) =>
    onIndexChange((index + delta + photos.length) % photos.length);

  const stepFromButton = (delta: number) => (event: MouseEvent) => {
    event.stopPropagation();
    step(delta);
  };

  useEffect(() => {
    const handleKey = ({ key }: KeyboardEvent) => {
      if (key === "ArrowRight") step(1);
      else if (key === "ArrowLeft") step(-1);
      else if (key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  });

  const imageStyle = {
    "--zoom-image": src ? `url("${resolveAssetUrl(src)}")` : "none",
  } as CSSProperties;

  return (
    // the scrim closes on click; Escape is handled by the window key listener
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={onClose}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const endX = event.changedTouches[0]?.clientX;

        // a swipe longer than 44px steps the photo
        if (touchStartX.current != null && endX != null) {
          const deltaX = endX - touchStartX.current;

          if (Math.abs(deltaX) > 44) step(deltaX < 0 ? 1 : -1);
        }

        touchStartX.current = null;
      }}
      className={joinClassNames(pageGlobal.scpScrim, styles.scrim)}
    >
      <button
        onClick={stepFromButton(-1)}
        aria-label="Previous"
        className={styles.prev}
      >
        <ChevronLeft size={22} strokeWidth={1.8} />
      </button>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="img"
        aria-label="Portfolio"
        onClick={(event) => event.stopPropagation()}
        className={joinClassNames(pageGlobal.scpPanel, styles.image)}
        style={imageStyle}
      ></div>
      <button
        onClick={stepFromButton(1)}
        aria-label="Next"
        className={styles.next}
      >
        <ChevronRight size={22} strokeWidth={1.8} />
      </button>
      <div className={styles.counter}>{`${index + 1} / ${photos.length}`}</div>
    </div>
  );
};
