import { X } from "lucide-react";
import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import { formatShortDate } from "./logic/calendar";
import { getPrivacySections, TERMS_SECTIONS } from "./logic/content";
import pageGlobal from "../../styles/features/booking/page-global.module.css";
import styles from "../../styles/features/booking/dialogs.module.css";
import type { BookingController } from "./hooks/use-booking";

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

/** The small modal (bottom sheet under 640px) used by Leave and Hold expired. */
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
        pageGlobal.bkscrim,
        pageGlobal.bkmscrim,
        styles.confirmScrim,
      )}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className={joinClassNames(
          pageGlobal.bkpanel,
          pageGlobal.bkmpanel,
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
              <X size={20} strokeWidth={2} />
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

/** Privacy / Terms sheet and the Leave and Hold expired dialogs. */
export const BookingDialogs = ({ booking }: BookingDialogsProps) => {
  const { state, stylist, actions } = booking;
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
          className={joinClassNames(pageGlobal.bkscrim, styles.docScrim)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={legalDocumentTitle}
            onClick={(event) => event.stopPropagation()}
            className={joinClassNames(pageGlobal.bkpanel, styles.docPanel)}
          >
            <div className={styles.docHead}>
              <h3 className={styles.docTitle}>{legalDocumentTitle}</h3>
              <button
                onClick={closeLegalDocument}
                aria-label="Close"
                className={styles.docClose}
              >
                <X size={20} strokeWidth={2} />
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
            onClick={actions.keepBooking}
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
    </>
  );
};
