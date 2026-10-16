import type { CSSProperties } from "react";
import { AllergyField } from "../../components/allergy-field/allergy-field";
import { AppointmentAddress } from "./appointment-address";
import type { AllergyState } from "./booking-state";
import { ContactFields } from "./contact-fields";
import { ContactSummary } from "./contact-summary";
import fields from "../../styles/features/booking/booking-fields.module.css";
import step from "../../styles/features/booking/booking-step.module.css";
import { CheckBox } from "./step-customise";
import styles from "../../styles/features/booking/step-details.module.css";
import type { BookingController } from "./use-booking";

interface StepDetailsProps {
  booking: BookingController;
}

const MAX_PHOTOS = 8;

/** Step 4 (Your details): log-in line or booking-as card, mobile address, contact fields, allergies and photos. */
export const StepDetails = ({ booking }: StepDetailsProps) => {
  const {
    state,
    stylist,
    detailsForm,
    isMobileStylist,
    showContactFields,
    needsMobile,
    actions,
    openPrivacy,
  } = booking;

  const { register } = detailsForm;
  const { setState } = actions;
  const { loggedIn, allergy, photos } = state;

  const setAllergy = (patch: Partial<AllergyState>) =>
    setState((current) => ({ allergy: { ...current.allergy, ...patch } }));

  return (
    <>
      <h1 className={step.title}>Your details</h1>
      <ContactSummary booking={booking} />
      {isMobileStylist && <AppointmentAddress booking={booking} />}
      {isMobileStylist && (showContactFields || needsMobile) && (
        <h2 className={fields.heading}>Your contact details</h2>
      )}
      <ContactFields booking={booking} />
      <div className={fields.grid}>
        <label className={fields.fieldWide}>
          <span className={fields.label}>
            Notes for your stylist{" "}
            <span className={fields.optional}>(optional)</span>
          </span>
          <textarea
            {...register("notes")}
            rows={3}
            className={styles.notes}
          ></textarea>
        </label>
      </div>
      <div data-screen-label="Allergies opt-in" className={styles.allergies}>
        <button
          role="checkbox"
          aria-checked={allergy.on ? "true" : "false"}
          onClick={() =>
            setAllergy(
              allergy.on
                ? { on: false, text: "", prior: false, focus: false }
                : { on: true, focus: true },
            )
          }
          className={styles.allergyToggle}
        >
          <CheckBox on={allergy.on} />
          <span>
            {`I have allergies or sensitivities to share with ${stylist.name} `}
            <span className={styles.muted}>(optional)</span>
          </span>
        </button>
        {allergy.on && allergy.prior && (
          <div data-al-anim="1" className={styles.prior}>
            <div className={styles.priorActions}>
              <span className={styles.priorAsk}>Still correct?</span>
              <button
                onClick={() => setAllergy({ prior: false, focus: true })}
                className={fields.linkButton}
              >
                Edit
              </button>
              <button
                onClick={() =>
                  setAllergy({
                    on: false,
                    text: "",
                    prior: false,
                    focus: false,
                  })
                }
                className={fields.linkButton}
              >
                Remove
              </button>
            </div>
            <div className={styles.priorLabel}>Allergies or sensitivities</div>
            <div className={styles.priorText}>{allergy.text}</div>
          </div>
        )}
        {allergy.on && !allergy.prior && (
          <div className={styles.allergyField}>
            <AllergyField
              stylistName={stylist.name}
              value={allergy.text}
              onChange={(text) => setAllergy({ text })}
              openPrivacy={openPrivacy}
              autoFocus={!!allergy.focus}
            />
          </div>
        )}
      </div>
      <div className={styles.photos}>
        <div className={styles.photosTitle}>
          Inspiration photos{" "}
          <span className={styles.photosOptional}>(optional)</span>
        </div>
        <div className={styles.photoRow}>
          {photos.map(({ name, url }, index) => {
            // the uploaded photo
            const photoStyle = {
              "--photo": `url("${url}")`,
            } as CSSProperties;

            return (
              <span key={url} className={styles.photo}>
                <span
                  role="img"
                  aria-label={name}
                  className={styles.photoImage}
                  style={photoStyle}
                ></span>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(url);

                    setState((current) => ({
                      photos: current.photos.filter(
                        (_photo, photoIndex) => photoIndex !== index,
                      ),
                    }));
                  }}
                  aria-label="Remove photo"
                  className={styles.removePhoto}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18"></path>
                  </svg>
                </button>
              </span>
            );
          })}
          <label className={styles.addPhoto}>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            <span className={styles.addLabel}>Add</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const added = Array.from(event.target.files ?? []).map(
                  (file) => ({
                    name: file.name,
                    url: URL.createObjectURL(file),
                  }),
                );

                event.target.value = "";

                if (added.length)
                  setState((current) => ({
                    photos: current.photos.concat(added).slice(0, MAX_PHOTOS),
                  }));
              }}
              className={styles.fileInput}
            />
          </label>
        </div>
      </div>
      {!loggedIn && (
        <div data-screen-label="Privacy line" className={styles.privacyLine}>
          We use your details to manage this booking.{" "}
          <button
            onClick={() => setState({ legalDocument: "privacy" })}
            className={fields.linkButton}
          >
            Privacy Policy
          </button>
        </div>
      )}
    </>
  );
};
