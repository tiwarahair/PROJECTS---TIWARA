import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";

export function IntroSection() {
  const [labelRef, labelVisible] = useFadeIn<HTMLSpanElement>();
  const [headingRef, headingVisible] = useFadeIn<HTMLHeadingElement>();
  const [bodyRef, bodyVisible] = useFadeIn<HTMLParagraphElement>();
  const [dividerRef, dividerVisible] = useFadeIn<HTMLDivElement>();

  return (
    <section className="intro">
      <span
        ref={labelRef}
        className={cx("intro-label", "fade-in", labelVisible && "visible")}
      >
        Our promise
      </span>
      <h2
        ref={headingRef}
        className={cx("fade-in", headingVisible && "visible")}
      >
        One platform. Every textured hair specialist <em>near you.</em>
      </h2>
      <p ref={bodyRef} className={cx("fade-in", bodyVisible && "visible")}>
        For too long, finding a skilled, reliable stylist for textured hair has
        been one of the most frustrating challenges in our community.
        Tiwara&apos;s House exists to change that — connecting clients with
        world-class textured hair specialists across the UK, with transparent
        pricing and effortless online booking.
      </p>
      <div
        ref={dividerRef}
        className={cx("intro-divider", "fade-in", dividerVisible && "visible")}
      />
    </section>
  );
}
