import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import { formatShortDate } from "./booking-calendar";
import { getPrivacySections, TERMS_SECTIONS } from "./booking-content";
import helmet from "../../styles/features/booking/booking-helmet.module.css";
import styles from "../../styles/features/booking/booking-dialogs.module.css";
import type { BookingController } from "./use-booking";

interface BookingDialogsProps {
  booking: BookingController;
}

interface ConfirmDialogProps {
  screenLabel: string;
  role?: "dialog" | "alertdialog";
  titleId: string;
  title: string;
  text: string;
  /** Bank check has a close button next to its title. */
  onClose?: () => void;
  children: ReactNode;
}

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6L6 18"></path>
  </svg>
);

/** The small modal (bottom sheet under 640px) used by Leave, Hold expired, Bank check and the wallet sheet. */
const ConfirmDialog = ({
  screenLabel,
  role = "dialog",
  titleId,
  title,
  text,
  onClose,
  children,
}: ConfirmDialogProps) => {
  const heading = (
    <h3 id={titleId} className={styles.confirmTitle}>
      {title}
    </h3>
  );

  return (
    <div
      data-screen-label={screenLabel}
      className={joinClassNames(
        helmet.bkscrim,
        helmet.bkmscrim,
        styles.confirmScrim,
      )}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className={joinClassNames(
          helmet.bkpanel,
          helmet.bkmpanel,
          styles.confirmPanel,
        )}
      >
        {onClose ? (
          <div className={styles.confirmHead}>
            {heading}
            <button
              onClick={onClose}
              aria-label="Close"
              className={styles.confirmClose}
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          heading
        )}
        <p className={styles.confirmText}>{text}</p>
        <div className={styles.confirmActions}>{children}</div>
      </div>
    </div>
  );
};

/** Privacy / Terms sheet and the Leave, Hold expired, Bank check and wallet dialogs. */
export const BookingDialogs = ({ booking }: BookingDialogsProps) => {
  const { state, stylist, money, actions } = booking;
  const { setState } = actions;

  const { legalDocument, time, date, calendarYear, calendarMonth, confirmed } =
    state;

  const legalDocumentTitle =
    legalDocument === "privacy" ? "Privacy Policy" : "Client Terms";

  const heldDate = date
    ? formatShortDate(calendarYear, calendarMonth, date)
    : "";

  const closeLegalDocument = () => setState({ legalDocument: null });

  return (
    <>
      {!!legalDocument && (
        // the scrim closes the sheet; the panel stops the click
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          data-screen-label={legalDocumentTitle}
          onClick={closeLegalDocument}
          className={joinClassNames(helmet.bkscrim, styles.docScrim)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={legalDocumentTitle}
            onClick={(event) => event.stopPropagation()}
            className={joinClassNames(helmet.bkpanel, styles.docPanel)}
          >
            <div className={styles.docHead}>
              <h3 className={styles.docTitle}>{legalDocumentTitle}</h3>
              <button
                onClick={closeLegalDocument}
                aria-label="Close"
                className={styles.docClose}
              >
                <CloseIcon />
              </button>
            </div>
            <div className={styles.docBody}>
              {(legalDocument === "privacy"
                ? getPrivacySections(stylist.name)
                : TERMS_SECTIONS
              ).map(({ title, body }) => (
                <div key={title}>
                  <div className={styles.docHeading}>{title}</div>
                  <p className={styles.docText}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!!state.leave && (
        <ConfirmDialog
          screenLabel="Leave booking"
          titleId="leaveOpen-t"
          title="Leave this booking?"
          text="We'll save your choices on this device, so you can pick up where you left off. Your held time will be released."
        >
          <button
            onClick={() => setState({ leave: null })}
            className={joinClassNames(styles.secondary, styles.wideButton)}
          >
            Keep booking
          </button>
          <button
            onClick={actions.confirmLeave}
            className={joinClassNames(styles.primary, styles.narrowButton)}
          >
            Leave
          </button>
        </ConfirmDialog>
      )}
      {state.holdExpired && !confirmed && (
        <ConfirmDialog
          screenLabel="Hold expired"
          role="alertdialog"
          titleId="holdExpired-t"
          title="Your slot is no longer held"
          text={`We held ${time} on ${heldDate} for 10 minutes and the time ran out. Please pick a time again.`}
        >
          <button onClick={actions.pickAgain} className={styles.primary}>
            Pick a time again
          </button>
        </ConfirmDialog>
      )}
      {state.bank && (
        <ConfirmDialog
          screenLabel="Bank check"
          titleId="bankOpen-t"
          title="Confirm with your bank"
          text={`Your bank wants to check this payment of ${money.dueToday}. In the real flow this is your bank's own screen; here you choose the outcome.`}
          onClose={actions.bankFail}
        >
          <button onClick={actions.bankFail} className={styles.secondary}>
            Fail
          </button>
          <button onClick={actions.bankApprove} className={styles.primary}>
            Approve
          </button>
        </ConfirmDialog>
      )}
      {!!state.wallet && (
        <ConfirmDialog
          screenLabel="Wallet sheet"
          titleId="walletOpen-t"
          title={state.wallet}
          text={`Pay ${money.dueToday} to Tiwára's House for your booking with ${stylist.name}. Demo sheet.`}
        >
          <button
            onClick={() => setState({ wallet: null })}
            className={styles.secondary}
          >
            Cancel
          </button>
          <button onClick={actions.walletPay} className={styles.walletPay}>
            {`Pay ${money.dueToday}`}
          </button>
        </ConfirmDialog>
      )}
    </>
  );
};
