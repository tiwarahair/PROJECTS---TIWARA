import { useEffect, useRef, useState } from "react";
import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { pageClosed, searchOpened } from "../../stores/overlays-slice";
import {
  QUIZ_SLIDES,
  QUIZ_TOTAL,
  recommendationsFor,
  resultTitleFor,
  type QuizAnswers,
  type QuizSlide,
} from "../../data/hair-quiz";

/** Single-choice answers move on after a brief pause so the tap registers. */
const AUTO_ADVANCE_MS = 280;

const LAYOUT_CLASS = {
  list: undefined,
  grid: "hq-options--grid",
  multi: "hq-options--multi",
} as const;

export function HairQuizOverlay() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.overlays.overlay.hairQuiz);
  const [slideIndex, setSlideIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const wasOpen = useRef(false);

  // Opening the quiz always starts it fresh, as the vanilla version did.
  useEffect(() => {
    if (open && !wasOpen.current) reset();
    wasOpen.current = open;
  }, [open]);

  function reset() {
    setSlideIndex(0);
    setAnswers({});
  }

  function goNext() {
    setSlideIndex((current) => Math.min(QUIZ_TOTAL, current + 1));
  }

  function chooseOne(slide: QuizSlide, value: string) {
    setAnswers((current) => ({ ...current, [slide.key]: value }));
    setTimeout(goNext, AUTO_ADVANCE_MS);
  }

  function toggleMany(slide: QuizSlide, value: string) {
    setAnswers((current) => {
      const chosen = current.goals ?? [];
      return {
        ...current,
        [slide.key]: chosen.includes(value)
          ? chosen.filter((entry) => entry !== value)
          : [...chosen, value],
      };
    });
  }

  function isChosen(slide: QuizSlide, value: string) {
    return slide.layout === "multi"
      ? (answers.goals ?? []).includes(value)
      : answers[slide.key] === value;
  }

  const showingResults = slideIndex >= QUIZ_TOTAL;
  const progress = Math.round(
    (Math.min(slideIndex, QUIZ_TOTAL) / QUIZ_TOTAL) * 100,
  );

  return (
    <div id="hairQuizPage" className={cx("hq-overlay", open && "open")}>
      <button
        className="hq-close"
        onClick={() => dispatch(pageClosed("hairQuiz"))}
        aria-label="Close"
      >
        ×
      </button>
      <div className="hq-inner">
        <div className="hq-progress-bar">
          <div className="hq-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="hq-slides">
          {QUIZ_SLIDES.map((slide, index) => (
            <div
              key={slide.key}
              className={cx("hq-slide", index === slideIndex && "active")}
            >
              <div className="hq-eyebrow">{slide.eyebrow}</div>
              <h2 className="hq-question">
                {slide.question}
                {slide.questionNote && (
                  <span className="hq-question-note">
                    {" "}
                    {slide.questionNote}
                  </span>
                )}
              </h2>
              <div className={cx("hq-options", LAYOUT_CLASS[slide.layout])}>
                {slide.options.map((option) => (
                  <button
                    key={option.value}
                    className={cx(
                      "hq-opt",
                      isChosen(slide, option.value) && "selected",
                      option.fullWidth && "hq-opt--full",
                    )}
                    onClick={() =>
                      slide.layout === "multi"
                        ? toggleMany(slide, option.value)
                        : chooseOne(slide, option.value)
                    }
                  >
                    {option.label}
                    {option.hint && <span>{option.hint}</span>}
                  </button>
                ))}
              </div>
              {/* Multi-select slides need an explicit Next, since choosing an
                  option there does not advance on its own. */}
              {slide.layout === "multi" && (
                <button className="hq-next-btn" onClick={goNext}>
                  Next →
                </button>
              )}
            </div>
          ))}

          <div className={cx("hq-slide", showingResults && "active")}>
            <div className="hq-eyebrow">Your results</div>
            <h2 className="hq-question">{resultTitleFor(answers)}</h2>
            <div className="hq-results">
              {recommendationsFor(answers).map((rec) => (
                <div key={rec.id} className="hq-result-item">
                  <h4>{rec.title}</h4>
                  <p>{rec.body}</p>
                </div>
              ))}
            </div>
            <div className="hq-book-prompt">
              <p>Want to see these results in action with a specialist?</p>
              <button
                className="hq-book-cta"
                onClick={() => {
                  dispatch(pageClosed("hairQuiz"));
                  dispatch(searchOpened(""));
                }}
              >
                Book an appointment at Tiwara&apos;s House →
              </button>
            </div>
            <button className="hq-retake" onClick={reset}>
              Retake quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
