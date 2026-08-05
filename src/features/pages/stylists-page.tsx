import { useState } from "react";
import { cx } from "../../utils/class-names";
import { useNavigate } from "react-router";
import { PATH } from "../../routes/routes";
import {
  STYLIST_EXPERIENCE_OPTIONS,
  STYLIST_PERKS,
} from "../../data/other/pages-content";
import { PageOverlay } from "./page-overlay";
import { PageHero, PageSection } from "./page-blocks";
import { STYLIST_SERVICES } from "../../data/services/services";

interface StylistApplication {
  name: string;
  business: string;
  location: string;
  experience: string;
  email: string;
  phone: string;
  instagram: string;
  services: string[];
  bio: string;
  portfolio: string;
}

const EMPTY: StylistApplication = {
  name: "",
  business: "",
  location: "",
  experience: "",
  email: "",
  phone: "",
  instagram: "",
  services: [],
  bio: "",
  portfolio: "",
};

/** Only these four block submission. */
const REQUIRED = ["name", "business", "location", "email"] as const;

export function ForStylistsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<StylistApplication>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (patch: Partial<StylistApplication>) =>
    setForm((current) => ({ ...current, ...patch }));

  const isMissing = (field: (typeof REQUIRED)[number]) =>
    showErrors && !form[field].trim();

  function submit() {
    if (REQUIRED.some((field) => !form[field].trim())) {
      setShowErrors(true);
      return;
    }
    setSubmitted(true);
    // The page scrolls back to the top so the success panel is in view.
    // The window scrolls now that the page is no longer a fixed container.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleService(service: string) {
    setForm((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((entry) => entry !== service)
        : [...current.services, service],
    }));
  }

  return (
    <PageOverlay domId="stylistsPage">
      <PageHero
        tone="gold"
        eyebrow="For stylists"
        title={
          <>
            Grow your clientele.
            <br />
            <em>Fill your calendar.</em>
          </>
        }
        subtitle="Join the UK's go-to platform for textured hair and reach thousands of clients who are actively looking for you."
      />

      <div className="pg-body">
        <PageSection tone="cream">
          <h2 className="pg-h2 pg-h2--centred">Why stylists choose us</h2>
          <div className="pg-perks">
            {STYLIST_PERKS.map(({ icon, title, description }) => (
              <div key={title} className="pg-perk">
                <span className="pg-perk-icon">{icon}</span>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </PageSection>
        {/* 
// TO DO: does this need re-working, to be an onboarding workflow?
// Or if it's just a form that submits to the backend: add form validation and submission to backend. Currently, the form just shows a success message on submit. */}
        <PageSection>
          <div className="pg-form-wrap">
            {submitted ? (
              <div className="pg-form-success">
                <div className="pg-success-icon">✓</div>
                <h3>Application received!</h3>
                <p>
                  Thank you for applying to join Tiwara&apos;s House. Our team
                  will review your application and be in touch within 48 hours.
                </p>
                <button
                  className="pg-cta-btn"
                  onClick={() => navigate(PATH.home)}
                >
                  Back to site
                </button>
              </div>
            ) : (
              <>
                <div className="pg-form-intro">
                  <h2 className="pg-h2">Apply to join</h2>
                  <p>
                    Fill in the form below and we&apos;ll be in touch within 48
                    hours to complete your onboarding.
                  </p>
                </div>

                <div className="pg-form-row">
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-name">
                      Your name <span className="pg-required">*</span>
                    </label>
                    <input
                      id="sf-name"
                      type="text"
                      className={cx(
                        "pg-input",
                        isMissing("name") && "pg-input--error",
                      )}
                      placeholder="e.g. Amara Johnson"
                      value={form.name}
                      onChange={(event) => set({ name: event.target.value })}
                    />
                  </div>
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-business">
                      Business / trading name{" "}
                      <span className="pg-required">*</span>
                    </label>
                    <input
                      id="sf-business"
                      type="text"
                      className={cx(
                        "pg-input",
                        isMissing("business") && "pg-input--error",
                      )}
                      placeholder="e.g. Amara Beauty Studio"
                      value={form.business}
                      onChange={(event) =>
                        set({ business: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="pg-form-row">
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-location">
                      City / location <span className="pg-required">*</span>
                    </label>
                    <input
                      id="sf-location"
                      type="text"
                      className={cx(
                        "pg-input",
                        isMissing("location") && "pg-input--error",
                      )}
                      placeholder="e.g. London, Manchester"
                      value={form.location}
                      onChange={(event) =>
                        set({ location: event.target.value })
                      }
                    />
                  </div>
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-experience">
                      Years of experience
                    </label>
                    <select
                      id="sf-experience"
                      className="pg-input pg-select"
                      value={form.experience}
                      onChange={(event) =>
                        set({ experience: event.target.value })
                      }
                    >
                      <option value="">Select…</option>
                      {STYLIST_EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pg-form-row">
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-email">
                      Email address <span className="pg-required">*</span>
                    </label>
                    <input
                      id="sf-email"
                      type="email"
                      className={cx(
                        "pg-input",
                        isMissing("email") && "pg-input--error",
                      )}
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={(event) => set({ email: event.target.value })}
                    />
                  </div>
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-phone">
                      Phone number
                    </label>
                    <input
                      id="sf-phone"
                      type="tel"
                      className="pg-input"
                      placeholder="+44 7700 000000"
                      value={form.phone}
                      onChange={(event) => set({ phone: event.target.value })}
                    />
                  </div>
                </div>

                <div className="pg-form-group">
                  <label className="pg-label" htmlFor="sf-instagram">
                    Instagram handle
                  </label>
                  <input
                    id="sf-instagram"
                    type="text"
                    className="pg-input"
                    placeholder="@yourstudio"
                    value={form.instagram}
                    onChange={(event) => set({ instagram: event.target.value })}
                  />
                </div>

                <div className="pg-form-group">
                  <span className="pg-label">
                    Services you offer <span className="pg-required">*</span>
                  </span>
                  <div className="pg-checkboxes">
                    {STYLIST_SERVICES.map((service) => (
                      <label key={service} className="pg-check">
                        <input
                          type="checkbox"
                          checked={form.services.includes(service)}
                          onChange={() => toggleService(service)}
                        />{" "}
                        {service}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pg-form-group">
                  <label className="pg-label" htmlFor="sf-bio">
                    Tell us a bit about yourself and your work
                  </label>
                  <textarea
                    id="sf-bio"
                    className="pg-input pg-textarea"
                    rows={4}
                    placeholder="Your background, specialities, the experience you create for clients…"
                    value={form.bio}
                    onChange={(event) => set({ bio: event.target.value })}
                  />
                </div>

                <div className="pg-form-group">
                  <label className="pg-label" htmlFor="sf-portfolio">
                    Portfolio link{" "}
                    <span className="pg-optional-label">
                      (Instagram, website, or Google Drive)
                    </span>
                  </label>
                  <input
                    id="sf-portfolio"
                    type="url"
                    className="pg-input"
                    placeholder="https://instagram.com/yourstudio"
                    value={form.portfolio}
                    onChange={(event) => set({ portfolio: event.target.value })}
                  />
                </div>

                <button className="pg-submit-btn" onClick={submit}>
                  Submit application →
                </button>
              </>
            )}
          </div>
        </PageSection>
      </div>
    </PageOverlay>
  );
}
