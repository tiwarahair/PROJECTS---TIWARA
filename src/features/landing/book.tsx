import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { BOOK_CTA_STEPS } from "../../data/landing-content";

export function Book() {
  const { openSearch } = useOverlayActions();

  return (
    <section className="book-cta-section" id="book">
      <span className="section-label">Find your match</span>
      <h2>
        Search. Choose. <em>Book.</em>
      </h2>
      <p>
        Every stylist on Tiwara&apos;s House is vetted, reviewed, and ready to
        book. Transparent pricing, instant confirmation, and a 25% deposit to
        secure your appointment.
      </p>
      <div className="book-cta-steps">
        {BOOK_CTA_STEPS.map(({ number, label }) => (
          <div key={number} className="bcs">
            <span className="bcs-num">{number}</span>
            <span className="bcs-label">{label}</span>
          </div>
        ))}
      </div>
      <button onClick={() => openSearch("")} className="btn-primary">
        Find stylists near you →
      </button>
    </section>
  );
}
