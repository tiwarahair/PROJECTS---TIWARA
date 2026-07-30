import { useState } from "react";
import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { JOIN_FIELDS, JOIN_PERKS } from "../../data/landing-content";

// TO DO: does this need re-working, to be an onboarding workflow?
// Or if it's just a form that submits to the backend: add form validation and submission to backend. Currently, the form just shows a success message on submit.
export function JoinPlatform() {
  const [textRef, textVisible] = useFadeIn<HTMLDivElement>();
  const [formRef, formVisible] = useFadeIn<HTMLDivElement>();
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="join-platform" id="join">
      <div className="join-inner">
        <div
          ref={textRef}
          className={cx("join-text", "fade-in", textVisible && "visible")}
        >
          <span className="section-label">For stylists</span>
          <h2>Are you a textured hair specialist?</h2>
          <p>
            Join Tiwara&apos;s House and reach thousands of clients in your
            area. Free to list. No commission on your first 20 bookings.
          </p>
          <div className="join-perks">
            {JOIN_PERKS.map((perk) => (
              <div key={perk} className="join-perk">
                {perk}
              </div>
            ))}
          </div>
        </div>
        {submitted ? (
          <div className="join-success" id="joinSuccess">
            Thank you for applying.
            <br />
            We&apos;ll be in touch within 48 hours.
          </div>
        ) : (
          <div
            ref={formRef}
            className={cx("join-form", "fade-in", formVisible && "visible")}
            id="joinForm"
          >
            {JOIN_FIELDS.map(({ placeholder, type }) => (
              <input
                key={placeholder}
                type={type}
                className="join-input"
                placeholder={placeholder}
              />
            ))}
            <button className="join-submit" onClick={() => setSubmitted(true)}>
              Apply to join →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
