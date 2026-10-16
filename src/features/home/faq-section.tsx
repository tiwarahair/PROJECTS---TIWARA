import { Plus } from "lucide-react";
import { useState } from "react";
import { faqs } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/home/faq-section.module.css";

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
                  <Plus size={22} strokeWidth={1.6} />
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
