import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { Link } from "react-router";
import { PATH } from "../../routes/routes";

export function QuizTeaser() {
  const [ref, visible] = useFadeIn<HTMLDivElement>();

  return (
    <section className="quiz-teaser">
      <div
        ref={ref}
        className={cx("quiz-teaser-inner", "fade-in", visible && "visible")}
      >
        <div className="qt-icon">✦</div>
        <div className="qt-body">
          <h3>Not sure what your hair needs?</h3>
          <p>
            Take our 2-minute hair quiz — get personalised product
            recommendations for your hair type and goals, then book an
            appointment to see them in action.
          </p>
        </div>
        <Link className="qt-cta" to={PATH.hairQuiz}>
          Take the quiz →
        </Link>
      </div>
    </section>
  );
}
