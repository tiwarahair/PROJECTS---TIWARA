import { Link } from "react-router";
import { AppleIcon, GoogleIcon } from "./brand-icons";
import { joinClassNames } from "../../utils/class-names";
import { getWindowText } from "../../utils/pricing";
import { getCancelSentence, getPaySub } from "./booking-content";
import { getWhenLine } from "./booking-calendar";
import styles from "./booking-confirmation.module.css";
import type { BookingController } from "./use-booking";

interface BookingConfirmationProps {
  booking: BookingController;
}

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5"></path>
  </svg>
);

/** "You're booked in." with the summary, where, inbox note, calendar buttons and the guest "Save your details" row. */
export const BookingConfirmation = ({ booking }: BookingConfirmationProps) => {
  const { state, stylist, service, money, custLine, address, actions } =
    booking;
  const { setState } = actions;
  const { acct, loggedIn, details } = state;
  const { name, addressFull, businessType, policies } = stylist;
  const isMobile = businessType === "mobile";
  const resendWaitMs = 30000 - (Date.now() - acct.sentAt);
  const resendOff = resendWaitMs > 0;
  const noop = () => {};

  return (
    <div data-screen-label="Confirmation" className={styles.confirmation}>
      <div className={styles.badge}>
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fffefb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5"></path>
        </svg>
      </div>
      <h1 className={styles.title}>{"You're booked in."}</h1>
      <p className={styles.lead}>
        A confirmation email is on its way to{" "}
        <strong className={styles.email}>{details.email}</strong> with the
        address and your receipt.
      </p>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.serviceName}>
            {service ? service.name : "Appointment"}
          </div>
          <div className={styles.strong}>{money.total}</div>
        </div>
        <div className={styles.custLine}>{custLine || "No add-ons"}</div>
        <div className={styles.facts}>
          <span className={styles.fact}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="3"></rect>
              <path d="M3 10h18M8 2v4M16 2v4"></path>
            </svg>
            {getWhenLine(state.calY, state.calM, state.date, state.time)}
          </span>
          <span
            data-screen-label="Confirmation where"
            className={styles.whereFact}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={styles.whereIcon}
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span className={styles.factLines}>
              <span>
                {isMobile
                  ? name +
                    " will come to " +
                    (address.clientAddress || "your address")
                  : name + ", " + addressFull}
              </span>
              {!isMobile && (
                <a
                  href={
                    "https://www.google.com/maps/search/?api=1&query=" +
                    encodeURIComponent(name + " " + addressFull)
                  }
                  target="_blank"
                  rel="noopener"
                  className={styles.directions}
                >
                  Get directions
                </a>
              )}
            </span>
          </span>
          <span className={styles.fact}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 7v5l3 3"></path>
            </svg>
            <span className={styles.factLines}>
              <span>{"Paid today " + money.dueToday}</span>
              <span>
                {getPaySub(money.PL.mode, money.balance, money.price, name)}
              </span>
            </span>
          </span>
        </div>
      </div>
      <div className={styles.inbox}>
        <div className={styles.inboxHead}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="2" y="4" width="20" height="16" rx="3"></rect>
            <path d="m3 6 9 7 9-7"></path>
          </svg>
          <span className={styles.eyebrow}>Manage it from your inbox</span>
        </div>
        <p className={styles.inboxText}>
          {
            "That email also carries your personal booking link. Use it any time to reschedule, cancel, add a note for "
          }
          {name}, or check what you still owe. Nothing to download, no password
          to remember.
        </p>
        <p className={styles.inboxNote}>
          {getCancelSentence(
            money.PL.mode,
            getWindowText(policies.freeWindowHrs),
          )}{" "}
          {loggedIn || acct.saved
            ? "You can also manage it from My bookings."
            : "Keep the email — it's the only way back in."}
        </p>
      </div>
      <div className={styles.calendarRow}>
        <button onClick={noop} className={styles.calendarButton}>
          + Apple Calendar
        </button>
        <button onClick={noop} className={styles.calendarButton}>
          + Google Calendar
        </button>
      </div>
      {!loggedIn && !acct.saved && !acct.hidden && !acct.sent && (
        <div data-screen-label="Save your details" className={styles.saveRow}>
          <div className={styles.saveText}>
            <div className={styles.saveTitle}>
              Save your details for next time
            </div>
            <div className={styles.saveSub}>
              Book faster and see all your bookings in one place.
            </div>
          </div>
          <div className={styles.saveActions}>
            <button
              onClick={() =>
                setState({ acct: { ...acct, sent: true, sentAt: Date.now() } })
              }
              className={styles.saveButton}
            >
              Save my details
            </button>
            <button
              onClick={() =>
                setState({ acct: { ...acct, saved: true, err: "" } })
              }
              aria-label="Continue with Google"
              className={styles.socialButton}
            >
              <GoogleIcon size={17} />
            </button>
            <button
              onClick={() =>
                setState({ acct: { ...acct, saved: true, err: "" } })
              }
              aria-label="Continue with Apple"
              className={styles.socialButton}
            >
              <AppleIcon size={17} />
            </button>
            <button
              onClick={() => setState({ acct: { ...acct, hidden: true } })}
              className={styles.noThanks}
            >
              No thanks
            </button>
          </div>
        </div>
      )}
      {!loggedIn && acct.sent && !acct.saved && (
        <div
          data-screen-label="Check your email"
          role="status"
          className={styles.sentNote}
        >
          <span className={styles.noteBadge}>
            <CheckIcon />
          </span>
          <span className={styles.sentText}>
            <strong className={styles.strong}>Check your email.</strong>{" "}
            {"We've sent a link to " +
              details.email +
              " to finish saving your details."}{" "}
            <button
              onClick={() => {
                if (!resendOff)
                  setState({ acct: { ...acct, sentAt: Date.now() } });
              }}
              disabled={resendOff}
              className={joinClassNames(
                styles.resend,
                resendOff ? styles.resendWaiting : styles.resendReady,
              )}
            >
              {resendOff
                ? "Resend email (" + Math.ceil(resendWaitMs / 1000) + "s)"
                : "Resend email"}
            </button>
          </span>
        </div>
      )}
      {!loggedIn && acct.saved && (
        <div
          data-screen-label="Details saved"
          role="status"
          className={styles.savedNote}
        >
          <span className={styles.noteBadge}>
            <CheckIcon />
          </span>
          <span>Your details are saved. This booking is in My bookings.</span>
        </div>
      )}
      <div className={styles.homeRow}>
        <Link to="/" className={styles.homeLink}>
          Back to home
        </Link>
      </div>
    </div>
  );
};
