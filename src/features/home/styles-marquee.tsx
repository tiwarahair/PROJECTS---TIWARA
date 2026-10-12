import { serviceGroups } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/home-page.module.css";
import styles from "../../styles/features/home/styles-marquee.module.css";

/** Ink band of service-group names scrolling forever; the second copy is for the seamless loop. */
export const StylesMarquee = () => (
  <div
    data-bg="#1a1714"
    data-screen-label="Styles marquee"
    className={styles.marquee}
  >
    <div className={joinClassNames(page.mqTrack, styles.track)}>
      <div className={styles.group}>
        {serviceGroups.map(({ id, name }) => (
          <span key={id} className={styles.name}>
            {name}
          </span>
        ))}
      </div>
      <div className={styles.group}>
        {serviceGroups.map(({ id, name }) => (
          <span key={id} aria-hidden="true" className={styles.name}>
            {name}
          </span>
        ))}
      </div>
    </div>
  </div>
);
