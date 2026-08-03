import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { useCarousel } from "../../hooks/use-carousel";
import { TESTIMONIALS } from "../../data/other/landing-content";

export function TestimonialsSection() {
  const [headRef, headVisible] = useFadeIn<HTMLDivElement>();
  const [trackRef, trackVisible] = useFadeIn<HTMLDivElement>();
  const { index, goTo } = useCarousel(TESTIMONIALS.length);

  return (
    <section className="testimonials">
      <div
        ref={headRef}
        className={cx("section-head", "fade-in", headVisible && "visible")}
      >
        <span className="section-label">In their words</span>
        <h2>What our clients say</h2>
      </div>
      {/* All slides stay mounted — `.testimonial` / `.testimonial.active`
          handle both display and absolute/relative positioning. */}
      <div
        ref={trackRef}
        className={cx(
          "testimonials-track",
          "fade-in",
          trackVisible && "visible",
        )}
      >
        {TESTIMONIALS.map(({ id, quote, author, detail }, slide) => (
          <div
            key={id}
            id={id}
            className={cx("testimonial", slide === index && "active")}
          >
            <div className="testimonial-quote">{quote}</div>
            <div className="testimonial-author">{author}</div>
            <div className="testimonial-detail">{detail}</div>
          </div>
        ))}
      </div>
      <div className="testimonial-dots">
        {TESTIMONIALS.map(({ id }, slide) => (
          <div
            key={id}
            className={cx("t-dot", slide === index && "active")}
            onClick={() => goTo(slide)}
          />
        ))}
      </div>
    </section>
  );
}
