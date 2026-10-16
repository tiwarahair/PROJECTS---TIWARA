import { joinClassNames } from "../../utils/class-names";
import { formatMobile } from "./logic/details";
import fields from "../../styles/features/booking/fields.module.css";
import styles from "../../styles/features/booking/contact-summary.module.css";
import type { BookingController } from "./hooks/use-booking";

interface ContactSummaryProps {
  booking: BookingController;
}

export const ContactSummary = ({ booking }: ContactSummaryProps) => {
  const { state, showContactFields, actions } = booking;
  const { details, loggedIn } = state;

  if (!loggedIn)
    return (
      <p data-screen-label="Log in line" className={styles.loginLine}>
        Have an account?{" "}
        <button
          type="button"
          onClick={actions.openLogin}
          className={joinClassNames(fields.linkButton, styles.loginLink)}
        >
          Log in
        </button>
      </p>
    );

  if (showContactFields) return null;

  return (
    <section
      aria-label="Booking as"
      data-screen-label="Booking as"
      className={styles.card}
    >
      <div className={styles.cardHead}>
        <p className={styles.cardName}>{`${details.first} ${details.last}`}</p>
        <button
          type="button"
          onClick={actions.openContactEdit}
          aria-label="Edit your details"
          className={fields.linkButton}
        >
          Edit
        </button>
      </div>
      <p className={styles.cardLine}>{details.email}</p>
      {!!details.phone && (
        <p className={styles.cardLine}>{formatMobile(details.phone)}</p>
      )}
      <p className={styles.cardLogout}>
        Not you?{" "}
        <button
          type="button"
          onClick={actions.logOut}
          className={fields.linkButton}
        >
          Log out
        </button>
      </p>
    </section>
  );
};
