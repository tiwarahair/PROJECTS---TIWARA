import { joinClassNames } from "../../../../utils/class-names";
import { asStyle } from "../../../../utils/as-style";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/payment.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface PaymentStepProps {
  view: BookingSheetView;
}

export const PaymentStep = ({ view }: PaymentStepProps) => {
  const { booking } = view;

  return (
    <div className={styles.payment}>
      <div className={styles.paymentHead}>
        <span className={styles.secondary145}>
          {`${booking.service} · ${booking.dayLabel}`}
        </span>
        <span
          className={styles.payBadge}
          style={asStyle({
            "--pay-bg": booking.payBackground,
            "--pay-color": booking.payColor,
          })}
        >
          {booking.payLabel}
        </span>
      </div>
      <div>
        <div className={styles.sectionLabel}>Price</div>
        {view.payLines.map(({ key, label, value }) => (
          <div key={key} className={styles.line}>
            <span className={shared.primaryText}>{label}</span>
            <span className={styles.numeric}>{value}</span>
          </div>
        ))}
        <div className={styles.lineTotal}>
          <span>Total</span>
          <span className={styles.numeric}>{booking.priceLabel}</span>
        </div>
      </div>
      <div>
        <div className={styles.sectionLabel}>Payments</div>
        {view.payReceived.map(({ key, label, subtitle, value, tone }) => (
          <div key={key} className={styles.line}>
            <span className={styles.minWidth}>
              <span className={styles.blockPrimary}>{label}</span>
              <span className={styles.lineSub}>{subtitle}</span>
            </span>
            <span
              className={joinClassNames(
                styles.received,
                tone === "paid" && styles.receivedPaid,
                tone === "failed" && styles.receivedFailed,
              )}
            >
              {value}
            </span>
          </div>
        ))}
        <div className={styles.lineTotal}>
          <span>{view.payRowLabel}</span>
          <span className={styles.numeric}>{booking.dueLabel}</span>
        </div>
      </div>
      <div className={styles.feeBox}>
        <div className={styles.feeLine}>
          <span className={styles.ink700}>
            {`Booking fee, paid by ${view.feeWho}`}
          </span>
          <span className={styles.inkNumeric}>{view.payFeeLabel}</span>
        </div>
        <div className={styles.feeNote}>
          {`£0.50 + 1.5% on top of your price. You keep the full ${booking.priceLabel}.`}
        </div>
      </div>
    </div>
  );
};
