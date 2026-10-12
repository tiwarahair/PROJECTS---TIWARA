import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { Link } from "react-router";
import { AllergyField } from "../../components/allergy-field/allergy-field";
import { joinClassNames } from "../../utils/class-names";
import { AppointmentAddress } from "./appointment-address";
import { getEmailFix } from "./booking-details";
import type { AllergyState, Details, FieldKey } from "./booking-state";
import { DEMO_DETAILS } from "./booking-state";
import fields from "../../styles/features/booking/booking-fields.module.css";
import step from "../../styles/features/booking/booking-step.module.css";
import { CheckBox } from "./step-customise";
import styles from "../../styles/features/booking/step-details.module.css";
import type { BookingController } from "./use-booking";

interface StepDetailsProps {
  booking: BookingController;
}

const MAX_PHOTOS = 8;

const ErrorIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    className={fields.errorIcon}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 7v6M12 16.5v.5"></path>
  </svg>
);

interface FieldProps {
  fieldKey: Exclude<FieldKey, "address">;
  label: string;
  wide?: boolean;
  error: string;
  showError: boolean;
  /** The input itself, given the id, error state and border class. */
  renderInput: (props: {
    id: string;
    invalid: "true" | "false";
    describedBy: string;
    borderClass: string | undefined;
  }) => ReactNode;
  prefix?: ReactNode;
}

/** Label, input and the inline error under it. */
const DetailsField = ({
  fieldKey,
  label,
  wide,
  error,
  showError,
  renderInput,
  prefix,
}: FieldProps) => {
  const id = `bk-${fieldKey}`;

  const input = renderInput({
    id,
    invalid: showError ? "true" : "false",
    describedBy: `${id}-err`,
    borderClass: showError ? fields.borderError : fields.border,
  });

  return (
    <div className={wide ? fields.fieldWide : fields.field}>
      <label htmlFor={id} className={fields.label}>
        {label}
      </label>
      {prefix ? (
        <span className={styles.phoneWrap}>
          {prefix}
          {input}
        </span>
      ) : (
        input
      )}
      {showError && (
        <div id={`${id}-err`} role="alert" className={fields.error}>
          <ErrorIcon />
          {error}
        </div>
      )}
    </div>
  );
};

/** Step 4 (Your details): log in / booking-as line, mobile address, contact fields, allergies and photos. */
export const StepDetails = ({ booking }: StepDetailsProps) => {
  const { state, stylist, errors, isMobileStylist, actions, openPrivacy } =
    booking;

  const { setState, touchField } = actions;
  const { details, loggedIn, allergy, photos } = state;
  const emailFix = getEmailFix(details.email);

  const loginReturn = encodeURIComponent(
    `/book?stylist=${stylist.id}&login=1&resume=1`,
  );

  const isShown = (key: FieldKey) =>
    (state.showErrors || !!state.touched[key]) && !!errors[key];

  const setDetail =
    (key: keyof Details, clean: (value: string) => string = (value) => value) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setState({ details: { ...details, [key]: clean(event.target.value) } });

  const setAllergy = (patch: Partial<AllergyState>) =>
    setState((current) => ({ allergy: { ...current.allergy, ...patch } }));

  const fieldProps = (key: Exclude<FieldKey, "address">) => ({
    fieldKey: key,
    error: errors[key] ?? "",
    showError: isShown(key),
  });

  return (
    <>
      <h1 className={step.title}>Your details</h1>
      {!loggedIn && (
        <p data-screen-label="Log in line" className={styles.loginLine}>
          Already have an account?{" "}
          <Link
            to={`/login?screen=cust-email&return=${loginReturn}`}
            onClick={actions.saveDraftNow}
            className={styles.loginLink}
          >
            Log in
          </Link>
        </p>
      )}
      {loggedIn && (
        <div data-screen-label="Booking as" className={styles.bookingAs}>
          <span>
            Booking as{" "}
            <strong className={styles.accountName}>
              {`${DEMO_DETAILS.first} ${DEMO_DETAILS.last}`}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Not you?{" "}
            <button onClick={actions.logOut} className={fields.linkButton}>
              Log out
            </button>
          </span>
        </div>
      )}
      {isMobileStylist && (
        <>
          <AppointmentAddress booking={booking} />
          <h2 className={fields.heading}>Your contact details</h2>
        </>
      )}
      <div className={fields.grid}>
        {(
          [
            ["first", "First name", "given-name"],
            ["last", "Last name", "family-name"],
            ["email", "Email", "email"],
          ] as const
        ).map(([key, label, autoComplete]) => (
          <DetailsField
            key={key}
            {...fieldProps(key)}
            label={label}
            wide={key === "email"}
            renderInput={({ id, invalid, describedBy, borderClass }) => (
              <input
                id={id}
                type={key === "email" ? "email" : "text"}
                autoComplete={autoComplete}
                value={details[key]}
                onChange={setDetail(key)}
                onBlur={() => touchField(key)}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className={joinClassNames(fields.input, borderClass)}
              />
            )}
          />
        ))}
        {!!emailFix && (
          <div
            data-screen-label="Email typo suggestion"
            role="status"
            className={styles.emailFix}
          >
            Did you mean{" "}
            <button
              onClick={() =>
                setState({ details: { ...details, email: emailFix } })
              }
              className={styles.emailFixButton}
            >
              {emailFix}
            </button>
            ?
          </div>
        )}
        <DetailsField
          {...fieldProps("phone")}
          label="Mobile"
          wide
          prefix={
            <span aria-hidden="true" className={styles.phonePrefix}>
              +44
            </span>
          }
          renderInput={({ id, invalid, describedBy, borderClass }) => (
            <input
              id={id}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="07700 900123"
              value={details.phone}
              onChange={setDetail("phone", (value) =>
                value.replace(/[^\d ]/g, "").slice(0, 13),
              )}
              onBlur={() => touchField("phone")}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              aria-label="Mobile, UK number"
              className={joinClassNames(styles.phoneInput, borderClass)}
            />
          )}
        />
        <label className={fields.fieldWide}>
          <span className={fields.label}>
            Notes for your stylist{" "}
            <span className={fields.optional}>(optional)</span>
          </span>
          <textarea
            value={details.notes}
            onChange={setDetail("notes")}
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
