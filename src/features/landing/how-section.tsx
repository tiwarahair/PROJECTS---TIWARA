import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { HOW_STEPS } from "../../data/landing-content";
import type { HowStep } from "../../types/content";

interface HowStepCardProps {
  step: HowStep;
}

/**
 * Each step needs its own observer, and `.how-step:nth-child(n)` colours the
 * numbers — so this renders a bare `.how-step` with no wrapper element.
 */
function HowStepCard({ step: { heading, body, number } }: HowStepCardProps) {
  const [ref, visible] = useFadeIn<HTMLDivElement>();

  return (
    <div ref={ref} className={cx("how-step", "fade-in", visible && "visible")}>
      <div className="how-step-num">{number}</div>
      <h3>{heading}</h3>
      <p>{body}</p>
    </div>
  );
}

export function HowSection() {
  const [headRef, headVisible] = useFadeIn<HTMLDivElement>();

  return (
    <section className="how">
      <div className="how-inner">
        <div
          ref={headRef}
          className={cx("section-head", "fade-in", headVisible && "visible")}
        >
          <span className="section-label">As simple as it should be</span>
          <h2>Three steps to your next appointment</h2>
        </div>
        <div className="how-steps">
          {HOW_STEPS.map((step) => (
            <HowStepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
