import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { VALUE_CARDS } from "../../data/landing-content";

export function AboutSection() {
  const [contentRef, contentVisible] = useFadeIn<HTMLDivElement>();

  return (
    <section className="about" id="about">
      <div className="about-visual">
        <div className="about-crown">TH</div>
        <div className="about-quote">
          <blockquote>
            &quot;To elevate the textured hair experience — through exceptional
            craft, cultural authenticity, and a community that looks after its
            own.&quot;
          </blockquote>
          <cite>Our mission</cite>
        </div>
      </div>
      {/* `.about-content .section-label` recolours the label, so the label has
          to stay inside this wrapper. */}
      <div
        ref={contentRef}
        className={cx("about-content", "fade-in", contentVisible && "visible")}
      >
        <span className="section-label">Our story</span>
        <h2>
          Art, heritage, and every strand <em>in between</em>
        </h2>
        <p>
          Tiwara&apos;s House was built from a simple truth: the Black community
          deserves better. Better access, better transparency, better
          experiences. No more hunting through group chats for a reliable name.
          No more travelling two hours for a stylist you can trust.
        </p>
        <p>
          What started as Manchester&apos;s premier Afrocentric salon has grown
          into a platform for every textured hair specialist across the UK —
          holding every stylist to the same standard of quality, artistry, and
          care.
        </p>
        <div className="values-grid">
          {VALUE_CARDS.map(({ title, description }) => (
            <div key={title} className="value-card">
              <strong>{title}</strong>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
