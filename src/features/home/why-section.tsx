import styles from "./why-section.module.css";

const WORDS = (
  "Afro hair deserves specialists, not guesswork. We built Tiwára's House so finding someone who knows your " +
  "texture takes minutes, not a week of messages. And so the stylists who do that work get paid properly for it."
).split(" ");

/** "Why we exist" scroll-scrubbed word reveal (hidden unless showWhy). */
export const WhySection = () => (
  <section
    id="wordreveal"
    data-bg="#FAF6EE"
    data-screen-label="Why we exist"
    className={styles.section}
  >
    <div className={styles.sticky}>
      <div className={styles.layout}>
        <div className={styles.track}>
          <span id="wrbar" className={styles.bar}></span>
        </div>
        <div>
          <div className={styles.eyebrow}>Why we exist</div>
          <p id="wrwords" className={styles.words}>
            {WORDS.map((word, index) => (
              <span key={index} className={styles.word}>
                {word}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  </section>
);
