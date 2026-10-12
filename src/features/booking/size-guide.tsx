import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { getBarCount, SIZE_GUIDE } from "./booking-content";
import helmet from "./booking-helmet.module.css";
import styles from "./size-guide.module.css";

interface SizeGuideProps {
  onClose: () => void;
}

/** "Choosing your size": Small / Medium / Large braid diagrams. */
export const SizeGuide = ({ onClose }: SizeGuideProps) => (
  // prototype: the scrim closes the guide; the panel stops the click
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div
    onClick={onClose}
    className={joinClassNames(helmet.bkscrim, styles.scrim)}
  >
    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
    <div
      onClick={(event) => event.stopPropagation()}
      className={joinClassNames(helmet.bkpanel, styles.panel)}
    >
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Size guide</div>
          <h3 className={styles.title}>Choosing your size</h3>
        </div>
        <button onClick={onClose} aria-label="Close" className={styles.close}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18"></path>
          </svg>
        </button>
      </div>
      <div className={joinClassNames(helmet.sizeguide, styles.grid)}>
        {SIZE_GUIDE.map(({ name, description, width, popular }) => {
          const barStyle = { "--bar-width": `${width}px` } as CSSProperties;

          return (
            <div
              key={name}
              className={joinClassNames(
                helmet.sgcard,
                styles.card,
                popular ? styles.cardPopular : styles.cardPlain,
              )}
            >
              <div className={joinClassNames(helmet.sgdiag, styles.diagramBox)}>
                <div className={styles.diagram}>
                  {Array.from({ length: getBarCount(width) }, (_bar, index) => (
                    <span
                      key={index}
                      className={styles.bar}
                      style={barStyle}
                    ></span>
                  ))}
                </div>
                {popular && (
                  <span
                    className={joinClassNames(helmet.sgbadge, styles.badge)}
                  >
                    <span className={styles.badgeDot}></span>
                    Most popular
                  </span>
                )}
              </div>
              <div className={joinClassNames(helmet.sgbody, styles.body)}>
                <div className={styles.name}>{name}</div>
                <p className={styles.desc}>{description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.note}>
        Diagrams show relative braid thickness. Your stylist will confirm the
        final size at your appointment.
      </p>
    </div>
  </div>
);
