import { Link } from "react-router";
import { serviceGroups } from "../../data";
import { joinClassNames } from "../../utils/class-names";
import { ArrowIcon } from "./arrow-icon";
import page from "./home-page.module.css";
import styles from "./quiz-strip.module.css";

const QUIZ_GROUP_IDS = ["braids", "locs", "natural", "wigs"];

/** Ink "Not sure what your hair needs?" strip (prototype Home "Hair quiz", #quiz). */
export const QuizStrip = () => {
  const chips = QUIZ_GROUP_IDS.map((id) =>
    serviceGroups.find((group) => group.id === id),
  ).filter((group) => !!group);

  return (
    <div
      id="quiz"
      data-bg="#1a1714"
      data-screen-label="Hair quiz"
      className={styles.strip}
    >
      <div className={joinClassNames(page.quizrow, styles.row)}>
        <h3 className={styles.title}>Not sure what your hair needs?</h3>
        <div className={styles.actions}>
          {chips.map(({ id, name, slug }) => (
            <Link key={id} to={`/search?group=${slug}`} className={styles.chip}>
              {name}
            </Link>
          ))}
          <Link to="/search" className={styles.cta}>
            Take the hair quiz
            <ArrowIcon strokeWidth="1.7" />
          </Link>
        </div>
      </div>
    </div>
  );
};
