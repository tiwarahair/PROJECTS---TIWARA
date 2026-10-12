import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { resolveAssetUrl } from "../../utils/asset-url";
import styles from "../../styles/features/stylist-profile/portfolio-lightbox.module.css";
import helmet from "../../styles/features/stylist-profile/stylist-profile-helmet.module.css";
import type { StylistProfileController } from "./use-stylist-profile";

interface PortfolioLightboxProps {
  zoom: StylistProfileController["zoom"];
}

/** Full-screen photo viewer: arrows / keys / swipe step through the gallery, the scrim closes it. */
export const PortfolioLightbox = ({
  zoom: { src, counter, close, prev, next, touchStart, touchEnd },
}: PortfolioLightboxProps) => {
  // zoomImgStyle backgroundImage: the current photo
  const imageStyle = {
    "--zoom-image": src ? `url("${resolveAssetUrl(src)}")` : "none",
  } as CSSProperties;

  return (
    // the scrim closes on click; Escape is handled by the window key listener
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={close}
      onTouchStart={touchStart}
      onTouchEnd={touchEnd}
      className={joinClassNames(helmet.scpScrim, styles.scrim)}
    >
      <button onClick={prev} aria-label="Previous" className={styles.prev}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="m14 6-6 6 6 6"></path>
        </svg>
      </button>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="img"
        aria-label="Portfolio"
        onClick={(event) => event.stopPropagation()}
        className={joinClassNames(helmet.scpPanel, styles.image)}
        style={imageStyle}
      ></div>
      <button onClick={next} aria-label="Next" className={styles.next}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="m10 6 6 6-6 6"></path>
        </svg>
      </button>
      <div className={styles.counter}>{counter}</div>
    </div>
  );
};
