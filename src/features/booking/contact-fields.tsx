import { Controller, useFormState } from "react-hook-form";
import { Link } from "react-router";
import { joinClassNames } from "../../utils/class-names";
import { getEmailFix } from "./logic/details";
import type { FieldKey } from "./logic/types";
import { DetailsField } from "./details-field";
import fields from "../../styles/features/booking/fields.module.css";
import styles from "../../styles/features/booking/contact-fields.module.css";
import type { BookingController } from "./hooks/use-booking";

interface ContactFieldsProps {
  booking: BookingController;
}

export const ContactFields = ({ booking }: ContactFieldsProps) => {
  const {
    state,
    detailsForm,
    isMobileStylist,
    showContactFields,
    needsMobile,
    actions,
  } = booking;

  const { register, setValue, control } = detailsForm;
  const { errors } = useFormState({ control });
  const { loggedIn, details } = state;
  const emailFix = getEmailFix(details.email);

  if (!showContactFields && !needsMobile) return null;

  const fieldProps = (key: Exclude<FieldKey, "address">) => ({
    fieldKey: key,
    error: errors[key]?.message ?? "",
    showError: !!errors[key],
  });

  const phoneField = (
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
        <Controller
          name="phone"
          control={control}
          render={({ field: { onChange, ...field } }) => (
            <input
              {...field}
              id={id}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              onChange={(event) =>
                onChange(event.target.value.replace(/[^\d ]/g, "").slice(0, 13))
              }
              aria-invalid={invalid}
              aria-describedby={describedBy}
              aria-label="Mobile, UK number"
              className={joinClassNames(styles.phoneInput, borderClass)}
            />
          )}
        />
      )}
    />
  );

  const gridClass = joinClassNames(
    fields.grid,
    styles.contactGrid,
    styles.reveal,
    loggedIn && showContactFields && !isMobileStylist && styles.editGrid,
  );

  if (!showContactFields) return <div className={gridClass}>{phoneField}</div>;

  return (
    <div className={gridClass}>
      {(
        [
          ["first", "First name", "given-name"],
          ["last", "Last name", "family-name"],
        ] as const
      ).map(([key, label, autoComplete]) => (
        <DetailsField
          key={key}
          {...fieldProps(key)}
          label={label}
          renderInput={({ id, invalid, describedBy, borderClass }) => (
            <input
              id={id}
              type="text"
              autoComplete={autoComplete}
              {...register(key)}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={joinClassNames(fields.input, borderClass)}
            />
          )}
        />
      ))}
      {loggedIn ? (
        <div className={fields.fieldWide}>
          <span className={fields.label}>Email</span>
          <p className={styles.lockedEmail}>{details.email}</p>
          <Link to="/account?section=personal" className={styles.accountLink}>
            Change your email in Account
          </Link>
        </div>
      ) : (
        <DetailsField
          {...fieldProps("email")}
          label="Email"
          wide
          renderInput={({ id, invalid, describedBy, borderClass }) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              {...register("email")}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              className={joinClassNames(fields.input, borderClass)}
            />
          )}
        />
      )}
      {!loggedIn && !!emailFix && (
        <div
          data-screen-label="Email typo suggestion"
          role="status"
          className={styles.emailFix}
        >
          Did you mean{" "}
          <button
            type="button"
            onClick={() =>
              setValue("email", emailFix, { shouldValidate: true })
            }
            className={styles.emailFixButton}
          >
            {emailFix}
          </button>
          ?
        </div>
      )}
      {phoneField}
      {loggedIn && (
        <p className={styles.saveNote}>
          Changes are saved to your account when you book.{" "}
          <button
            type="button"
            onClick={actions.cancelContactEdit}
            className={fields.linkButton}
          >
            Cancel
          </button>
        </p>
      )}
    </div>
  );
};
