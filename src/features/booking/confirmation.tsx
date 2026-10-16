import { Calendar, Check, Clock, Mail, MapPin } from "lucide-react";
import { Link } from "react-router";
import { AppleLogo, GoogleLogo } from "../../components/icons/brand-icons";
import { joinClassNames } from "../../utils/class-names";
import { getWindowText } from "../../utils/pricing";
import { getCancelSentence, getPaySubtitle } from "./logic/content";
import { getWhenLine } from "./logic/calendar";
import styles from "../../styles/features/booking/confirmation.module.css";
import type { BookingController } from "./hooks/use-booking";

interface BookingConfirmationProps {
  booking: BookingController;
}

/** "You're booked in." with the summary, where, inbox note, calendar buttons and the guest "Save your details" row. */
export const BookingConfirmation = ({ booking }: BookingConfirmationProps) => {
  const {
    state,
    stylist,
    service,
    money,
    customisationLine,
    address,
    actions,
  } = booking;

  const { setState } = actions;
  const { account, loggedIn, details } = state;
  const { name, addressFull, businessType, policies } = stylist;
  const isMobile = businessType === "mobile";
  const clientAddress = address.clientAddress || "your address";
  const mapsQuery = encodeURIComponent(`${name} ${addressFull}`);
  const resendWaitMs = 30000 - (Date.now() - account.sentAt);
  const resendOff = resendWaitMs > 0;

  const noop = () => {};

  return (
    <div data-screen-label="Confirmation" className={styles.confirmation}>
      <div className={styles.badge}>
        <Check size={34} strokeWidth={2.5} color="#fffefb" />
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
        <div className={styles.custLine}>
          {customisationLine || "No add-ons"}
        </div>
        <div className={styles.facts}>
          <span className={styles.fact}>
            <Calendar size={15} strokeWidth={1.5} />
            {getWhenLine(
              state.calendarYear,
              state.calendarMonth,
              state.date,
              state.time,
            )}
          </span>
          <span
            data-screen-label="Confirmation where"
            className={styles.whereFact}
          >
            <MapPin size={15} strokeWidth={1.5} className={styles.whereIcon} />
            <span className={styles.factLines}>
              <span>
                {isMobile
                  ? `${name} will come to ${clientAddress}`
                  : `${name}, ${addressFull}`}
              </span>
              {!isMobile && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
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
            <Clock size={15} strokeWidth={1.5} />
            <span className={styles.factLines}>
              <span>{`Paid today ${money.dueToday}`}</span>
              <span>
                {getPaySubtitle(
                  money.policy.mode,
                  money.balance,
                  money.price,
                  name,
                )}
              </span>
            </span>
          </span>
        </div>
      </div>
      <div className={styles.inbox}>
        <div className={styles.inboxHead}>
          <Mail size={18} strokeWidth={1.6} />
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
            money.policy.mode,
            getWindowText(policies.freeWindowHours),
          )}{" "}
          {loggedIn || account.saved
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
      {!loggedIn && !account.saved && !account.hidden && !account.sent && (
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
                setState({
                  account: { ...account, sent: true, sentAt: Date.now() },
                })
              }
              className={styles.saveButton}
            >
              Save my details
            </button>
            <button
              onClick={() =>
                setState({ account: { ...account, saved: true, error: "" } })
              }
              aria-label="Continue with Google"
              className={styles.socialButton}
            >
              <GoogleLogo size={17} />
            </button>
            <button
              onClick={() =>
                setState({ account: { ...account, saved: true, error: "" } })
              }
              aria-label="Continue with Apple"
              className={styles.socialButton}
            >
              <AppleLogo size={17} />
            </button>
            <button
              onClick={() =>
                setState({ account: { ...account, hidden: true } })
              }
              className={styles.noThanks}
            >
              No thanks
            </button>
          </div>
        </div>
      )}
      {!loggedIn && account.sent && !account.saved && (
        <div
          data-screen-label="Check your email"
          role="status"
          className={styles.sentNote}
        >
          <span className={styles.noteBadge}>
            <Check size={14} strokeWidth={2.6} />
          </span>
          <span className={styles.sentText}>
            <strong className={styles.strong}>Check your email.</strong>{" "}
            {`We've sent a link to ${details.email} to finish saving your details.`}{" "}
            <button
              onClick={() => {
                if (!resendOff)
                  setState({ account: { ...account, sentAt: Date.now() } });
              }}
              disabled={resendOff}
              className={joinClassNames(
                styles.resend,
                resendOff ? styles.resendWaiting : styles.resendReady,
              )}
            >
              {resendOff
                ? `Resend email (${Math.ceil(resendWaitMs / 1000)}s)`
                : "Resend email"}
            </button>
          </span>
        </div>
      )}
      {!loggedIn && account.saved && (
        <div
          data-screen-label="Details saved"
          role="status"
          className={styles.savedNote}
        >
          <span className={styles.noteBadge}>
            <Check size={14} strokeWidth={2.6} />
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
