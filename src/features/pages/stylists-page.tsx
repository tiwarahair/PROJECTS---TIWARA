import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cx } from "../../utils/class-names";
import { useNavigate } from "react-router";
import { PATH } from "../../routes/routes";
import {
  STYLIST_EXPERIENCE_OPTIONS,
  STYLIST_PERKS,
} from "../../data/other/pages-content";
import { PageHeader } from "./page-header";
import { PageHero, PageSection } from "./page-blocks";
import { FieldError } from "../../components/field-error";
import { STYLIST_SERVICES } from "../../data/services/services";
import {
  stylistApplicationSchema,
  type StylistApplicationValues,
} from "../../schemas/stylist-application";

const EMPTY: StylistApplicationValues = {
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

export function ForStylistsPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StylistApplicationValues>({
    resolver: zodResolver(stylistApplicationSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  const services = watch("services");

  // TO DO: Phase 2 replaces this with the real `submit-application` call.
  const submit = handleSubmit(() => {
    setSubmitted(true);
    // The page scrolls back to the top so the success panel is in view.
    // The window scrolls now that the page is no longer a fixed container.
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function toggleService(service: string) {
    setValue(
      "services",
      services.includes(service)
        ? services.filter((entry) => entry !== service)
        : [...services, service],
      { shouldValidate: true },
    );
  }

  /** Shared class/aria treatment for one text field. */
  const fieldProps = (
    name: keyof StylistApplicationValues,
    extraClass?: string,
  ) => ({
    className: cx("pg-input", extraClass, errors[name] && "pg-input--error"),
    "aria-invalid": Boolean(errors[name]),
    ...register(name),
  });

  return (
    <PageHeader domId="stylistsPage">
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
              <form onSubmit={submit} noValidate>
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
                      placeholder="e.g. Amara Johnson"
                      {...fieldProps("name")}
                    />
                    <FieldError message={errors.name?.message} />
                  </div>
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-business">
                      Business / trading name{" "}
                      <span className="pg-required">*</span>
                    </label>
                    <input
                      id="sf-business"
                      type="text"
                      placeholder="e.g. Amara Beauty Studio"
                      {...fieldProps("business")}
                    />
                    <FieldError message={errors.business?.message} />
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
                      placeholder="e.g. London, Manchester"
                      {...fieldProps("location")}
                    />
                    <FieldError message={errors.location?.message} />
                  </div>
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-experience">
                      Years of experience
                    </label>
                    <select
                      id="sf-experience"
                      className="pg-input pg-select"
                      {...register("experience")}
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
                      placeholder="you@email.com"
                      {...fieldProps("email")}
                    />
                    <FieldError message={errors.email?.message} />
                  </div>
                  <div className="pg-form-group">
                    <label className="pg-label" htmlFor="sf-phone">
                      Phone number
                    </label>
                    <input
                      id="sf-phone"
                      type="tel"
                      placeholder="+44 7700 000000"
                      {...fieldProps("phone")}
                    />
                    <FieldError message={errors.phone?.message} />
                  </div>
                </div>

                <div className="pg-form-group">
                  <label className="pg-label" htmlFor="sf-instagram">
                    Instagram handle
                  </label>
                  <input
                    id="sf-instagram"
                    type="text"
                    placeholder="@yourstudio"
                    {...fieldProps("instagram")}
                  />
                  <FieldError message={errors.instagram?.message} />
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
                          checked={services.includes(service)}
                          onChange={() => toggleService(service)}
                        />{" "}
                        {service}
                      </label>
                    ))}
                  </div>
                  <FieldError message={errors.services?.message} />
                </div>

                <div className="pg-form-group">
                  <label className="pg-label" htmlFor="sf-bio">
                    Tell us a bit about yourself and your work
                  </label>
                  <textarea
                    id="sf-bio"
                    rows={4}
                    placeholder="Your background, specialities, the experience you create for clients…"
                    {...fieldProps("bio", "pg-textarea")}
                  />
                  <FieldError message={errors.bio?.message} />
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
                    placeholder="https://instagram.com/yourstudio"
                    {...fieldProps("portfolio")}
                  />
                  <FieldError message={errors.portfolio?.message} />
                </div>

                <button type="submit" className="pg-submit-btn">
                  Submit application →
                </button>
              </form>
            )}
          </div>
        </PageSection>
      </div>
    </PageHeader>
  );
}
