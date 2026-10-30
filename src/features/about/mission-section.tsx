import { missionLines } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import story from "../../styles/components/story-page/index.module.css";
import styles from "../../styles/features/about/mission-section.module.css";

const MISSION_WORDS = missionLines.flatMap(({ text, tone }) =>
  text.split(" ").map((word) => ({ word, tone })),
);

export const MissionSection = () => (
  <section
    id="a-mission"
    data-bg="#FAF6EE"
    data-screen-label="Mission"
    className={styles.mission}
  >
    <div className={styles.inner}>
      <p id="a-words" className={styles.words}>
        {MISSION_WORDS.map(({ word, tone }, index) => (
          <span
            key={`${word}-${index}`}
            data-word=""
            className={tone === "muted" ? styles.muted : styles.ink}
          >
            {word}{" "}
          </span>
        ))}
      </p>
      <div className={joinClassNames(story.grid, styles.grid)}>
        <div data-rv="" className={styles.label}>
          Our mission
        </div>
        <div className={styles.copy}>
          <p data-rv="" className={styles.lead}>
            We connect clients with braiders, loctitians, natural hair stylists
            and protective style specialists across the UK, and give those
            stylists the tools to run their chair like a business: bookings,
            deposits, reminders and payments in one place.
          </p>
          <p data-rv="" className={styles.body}>
            Our mission is to elevate the afro hair process. Finding and booking
            the right stylist should feel as considered as the hair itself, and
            the people doing the work should be able to grow on their own terms.
          </p>
        </div>
      </div>
    </div>
  </section>
);
