import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { getBarCount, SIZE_GUIDE } from "./logic/content";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import styles from "../../styles/features/booking/size-guide.module.css";

interface SizeGuideProps {
  onClose: () => void;
}

/** "Choosing your size": Small / Medium / Large braid diagrams. */
export const SizeGuide = ({ onClose }: SizeGuideProps) => (
  // the scrim closes the guide; the panel stops the click
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div
    onClick={onClose}
    className={joinClassNames(pageGlobal.bkscrim, styles.scrim)}
  >
    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
    <div
      onClick={(event) => event.stopPropagation()}
      className={joinClassNames(pageGlobal.bkpanel, styles.panel)}
    >
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Size guide</div>
          <h3 className={styles.title}>Choosing your size</h3>
        </div>
        <button onClick={onClose} aria-label="Close" className={styles.close}>
          <X size={20} strokeWidth={1.9} />
        </button>
      </div>
      <div className={joinClassNames(pageGlobal.sizeguide, styles.grid)}>
        {SIZE_GUIDE.map(({ name, description, width, popular }) => {
          const barStyle = { "--bar-width": `${width}px` } as CSSProperties;

          return (
            <div
              key={name}
              className={joinClassNames(
                pageGlobal.sgcard,
                styles.card,
                popular ? styles.cardPopular : styles.cardPlain,
              )}
            >
              <div
                className={joinClassNames(pageGlobal.sgdiag, styles.diagramBox)}
              >
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
                    className={joinClassNames(pageGlobal.sgbadge, styles.badge)}
                  >
                    <span className={styles.badgeDot}></span>
                    Most popular
                  </span>
                )}
              </div>
              <div className={joinClassNames(pageGlobal.sgbody, styles.body)}>
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
