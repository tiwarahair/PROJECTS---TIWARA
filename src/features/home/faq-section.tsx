import { useState } from "react";
import { faqs } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import styles from "./faq-section.module.css";

/** Accordion FAQ, one answer open at a time. */
export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <section
      id="faq"
      data-bg="#FAF6EE"
      data-screen-label="FAQ"
      className={styles.section}
    >
      <div className={styles.inner}>
        <h2 data-rv="" className={styles.title}>
          Frequently asked questions
        </h2>
        <div className={styles.list}>
          {faqs.map(({ question, answer }, index) => (
            <div
              key={question}
              data-rv=""
              className={joinClassNames(
                styles.item,
                openIndex === index && styles.open,
              )}
            >
              <button
                className={styles.question}
                onClick={() =>
                  setOpenIndex((current) => (current === index ? -1 : index))
                }
              >
                {question}
                <span className={styles.chevron}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M4 12h16"></path>
                    <path d="M12 4v16" className={styles.plusVertical}></path>
                  </svg>
                </span>
              </button>
              <div className={styles.answerBody}>
                <div className={styles.answerClip}>
                  <div className={styles.answer}>{answer}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
