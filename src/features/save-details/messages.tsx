import { Check } from "lucide-react";
import { Link } from "react-router";
import { useRenewBookingInviteMutation } from "../../stores/api-slice";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/save-details/index.module.css";

const LOGIN_HREF = `/login?screen=cust-email&return=${encodeURIComponent("/account?section=bookings")}`;

export const SavedMessage = ({ email }: { email: string }) => (
  <div data-sd-in="1" data-screen-label="Details saved" className={styles.done}>
    <div className={styles.badge}>
      <Check size={30} strokeWidth={2.5} color="#fffefb" />
    </div>
    <h1 className={styles.title}>Your details are saved</h1>
    <p className={styles.lead}>{`Log in with ${email} next time you book.`}</p>
    <div className={styles.doneActions}>
      <Link to="/account?section=bookings" className={styles.primaryLink}>
        View my bookings
      </Link>
      <Link to="/" className={styles.secondaryLink}>
        Back to home
      </Link>
    </div>
  </div>
);

export const AccountExistsMessage = ({ email }: { email: string }) => (
  <div
    data-sd-in="1"
    data-screen-label="Account exists"
    className={styles.done}
  >
    <h1 className={styles.title}>You already have an account</h1>
    <p className={styles.lead}>
      {`Log in with ${email} to see your bookings.`}
    </p>
    <div className={styles.doneActions}>
      <Link to={LOGIN_HREF} className={styles.primaryLink}>
        Log in
      </Link>
      <Link to="/" className={styles.secondaryLink}>
        Back to home
      </Link>
    </div>
  </div>
);

export const ExpiredMessage = ({
  token,
  email,
}: {
  token: string;
  email: string;
}) => {
  const [renew, { isLoading, isSuccess: isSent, error }] =
    useRenewBookingInviteMutation();

  return (
    <div data-sd-in="1" data-screen-label="Link expired">
      <h1 className={styles.title}>This link has expired</h1>
      <p className={styles.lead}>
        {`Links to save your details work for 24 hours. We'll send a new one to ${email}.`}
      </p>
      {isSent && (
        <div role="status" className={styles.sentNote}>
          <Check
            size={16}
            strokeWidth={2.2}
            color="var(--accent-700)"
            className={styles.sentIcon}
          />
          <span>{`Check your email. We've sent a new link to ${email}.`}</span>
        </div>
      )}
      {!!error && !isSent && (
        <p
          role="alert"
          className={joinClassNames(styles.error, styles.sentNote)}
        >
          We couldn’t send a new link. Try again.
        </p>
      )}
      <button
        onClick={() => void renew(token)}
        disabled={isSent || isLoading}
        className={joinClassNames(
          styles.sendNew,
          isSent ? styles.sendDone : styles.sendReady,
        )}
      >
        {isLoading ? "Sending…" : "Send a new link"}
      </button>
    </div>
  );
};
