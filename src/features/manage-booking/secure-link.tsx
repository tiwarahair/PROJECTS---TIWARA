import { Link } from "react-router";
import { PageMessage } from "../../components/page-message/page-message";
import {
  getErrorMessage,
  useSecureBookingLinkMutation,
} from "../../stores/api-slice";
import { writeSession } from "../../utils/page-flags";
import styles from "../../styles/features/manage-booking/index.module.css";
import secure from "../../styles/features/manage-booking/secure-link.module.css";

const MESSAGES: Record<string, { title: string; text: string }> = {
  link_not_valid: {
    title: "This link isn’t valid",
    text: "Use the link in your latest booking email.",
  },
  already_used: {
    title: "You’ve already done this",
    text: "We emailed you a new booking link at the time. Use the link in your latest booking email.",
  },
};

/** "This wasn't me", route "/manage?secure=": stops every old manage link and emails a new one. */
export const SecureLink = ({ token }: { token: string }) => {
  const [reset, { data, error, isLoading }] = useSecureBookingLinkMutation();
  const message = error && MESSAGES[getErrorMessage(error)];

  const stopOldLink = async () => {
    const result = await reset(token);

    if ("data" in result) writeSession("tw_manage_token", null);
  };

  if (message)
    return (
      <PageMessage {...message} linkLabel="Go to Tiwára’s House" linkHref="/" />
    );

  if (data)
    return (
      <div data-screen-label="Booking link stopped" className={secure.box}>
        <h1 className={styles.title}>Your old link no longer works</h1>
        <p className={secure.text}>
          {`We’ve emailed a new booking link to ${data.email}. If your booking was changed or cancelled and you didn’t do it, reply to that email or contact ${data.stylist_name}.`}
        </p>
        <Link to="/" className={styles.bookAgain}>
          Go to Tiwára’s House
        </Link>
      </div>
    );

  return (
    <div data-screen-label="Stop booking link" className={secure.box}>
      <h1 className={styles.title}>Stop your old booking link</h1>
      <p className={secure.text}>
        If someone else has your booking link, we’ll stop it working and email
        you a new one. Anyone with the old link won’t be able to see or change
        your booking.
      </p>
      {!!error && (
        <p role="alert" className={secure.error}>
          Something went wrong. Try again.
        </p>
      )}
      <button
        onClick={() => void stopOldLink()}
        disabled={isLoading}
        className={secure.button}
      >
        {isLoading ? "Sending…" : "Send me a new link"}
      </button>
    </div>
  );
};
