import { Check } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { ICONS } from "./data";
import { getReceiptView } from "./receipt-view";
import { RECORD_VIA_LABELS } from "./view";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import styles from "../../styles/components/checkout/done.module.css";
import shared from "../../styles/components/checkout/checkout-sheet.module.css";
import { formatMoney } from "../../utils/money";

export const CheckoutDone = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, goTo, booking } = checkout;
  const { done, name, cardText } = view;
  const receipt = getReceiptView(checkout, view);

  const linkTarget =
    state.linkVia === "sms"
      ? `SMS to ${booking.phone}`
      : `email to ${booking.email}`;

  const getSummary = () => {
    if (done.method === "card")
      return `${formatMoney(done.charged)} charged to ${cardText}.`;

    if (done.method === "link")
      return `Payment link for ${formatMoney(done.charged)} sent by ${linkTarget}.`;

    if (done.method === "record")
      return `${formatMoney(done.charged)} ${(RECORD_VIA_LABELS[done.via] || "").toLowerCase()} recorded.`;

    if (done.refundAuto > 0)
      return `${formatMoney(done.refundAuto)} refund on its way to ${cardText}.`;

    return `Nothing to pay. ${name} had already paid.`;
  };

  const summary = getSummary();

  return (
    <div className={styles.doneView}>
      <span
        className={joinClassNames(styles.doneTick, shared.motion)}
        data-ck-m="1"
      >
        <Check size={28} strokeWidth={2.4} />
      </span>
      <div
        className={joinClassNames(styles.doneHead, shared.motion)}
        data-ck-m="1"
      >
        <h2 className={styles.doneTitle}>Checkout complete</h2>
        <div className={styles.doneSub}>{summary}</div>
        {done.method === "link" && (
          <span className={styles.awaitingTag}>
            <ICONS.clock size={14} strokeWidth={2} />
            Completed · Awaiting payment
          </span>
        )}
      </div>
      <div
        className={joinClassNames(styles.doneReceipt, shared.motion)}
        data-ck-m="1"
      >
        <div className={styles.doneReceiptHead}>
          <span className={styles.doneStylist}>{receipt.stylist}</span>
          <span>{receipt.date}</span>
        </div>
        <div className={styles.doneLines}>
          {receipt.lines.map(({ key, label, value, isAdjust }) => (
            <div
              key={key}
              className={joinClassNames(
                shared.receiptLine,
                isAdjust ? styles.doneLineAdjust : styles.doneLineItem,
              )}
            >
              <span>{label}</span>
              <span className={shared.numeric}>{value}</span>
            </div>
          ))}
          {!!receipt.tip && (
            <div className={styles.doneExtra}>
              <span>Tip</span>
              <span className={shared.numeric}>{receipt.tip}</span>
            </div>
          )}
          {!!receipt.fee && (
            <div className={styles.doneExtra}>
              <span>Booking fee, paid at booking</span>
              <span className={shared.numeric}>{receipt.fee}</span>
            </div>
          )}
        </div>
        <div className={styles.donePaid}>
          <span>Total paid</span>
          <span className={shared.numeric}>{receipt.paid}</span>
        </div>
        <div className={styles.doneMethod}>{receipt.method}</div>
        <button
          className={styles.viewReceipt}
          onClick={() => {
            setState({ fromDone: true });
            goTo("receipt", 1);
          }}
        >
          View full receipt
        </button>
      </div>
      <div className={styles.doneNote}>
        {done.method === "link"
          ? `${name} gets a receipt once they pay. A review request goes to them automatically.`
          : `A review request goes to ${name} automatically.`}
      </div>
    </div>
  );
};
