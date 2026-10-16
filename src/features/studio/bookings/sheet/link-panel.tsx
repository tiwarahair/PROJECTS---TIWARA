import { Send } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/link-panel.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface LinkPanelProps {
  view: BookingSheetView;
}

export const LinkPanel = ({ view }: LinkPanelProps) => {
  const { booking } = view;

  return (
    <div className={shared.panel}>
      <Send
        className={shared.panelIcon}
        size={16}
        strokeWidth={1.7}
        color="var(--text-secondary)"
      />
      <div className={shared.grow}>
        <div className={shared.panelLabel}>{booking.protectionWord}</div>
        <div className={shared.panelValue}>
          {`Link sent to ${booking.firstName} ${booking.linkSentLabel}`}
        </div>
        <div className={styles.linkActions}>
          <button
            className={joinClassNames(
              styles.pill,
              !booking.canResend && styles.pillOff,
            )}
            onClick={view.resend}
            disabled={!booking.canResend}
          >
            {booking.resendLabel}
          </button>
          <button className={styles.pill} onClick={view.copyPaymentLink}>
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
};
