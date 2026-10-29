import { CtaArrowIcon } from "../../components/icons/custom-icons";
import { Link } from "react-router";
import { DarkBandSkeleton } from "../../components/skeleton/dark-band";
import { useGetCatalogueQuery } from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/index.module.css";
import styles from "../../styles/features/home/quiz-strip.module.css";

const QUIZ_GROUP_IDS = ["braids", "locs", "natural", "wigs"];

export const QuizStrip = () => {
  const { data: catalogue, isLoading } = useGetCatalogueQuery();

  const chips = QUIZ_GROUP_IDS.map((id) =>
    catalogue?.groups.find((group) => group.id === id),
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
          {isLoading &&
            QUIZ_GROUP_IDS.map((id) => (
              <DarkBandSkeleton key={id} variant="chip" />
            ))}
          {chips.map(({ id, name }) => (
            <Link key={id} to={`/search?group=${id}`} className={styles.chip}>
              {name}
            </Link>
          ))}
          <Link to="/search" className={styles.cta}>
            Take the hair quiz
            <CtaArrowIcon size={16} strokeWidth={1.7} />
          </Link>
        </div>
      </div>
    </div>
  );
};
