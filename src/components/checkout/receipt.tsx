import { joinClassNames } from "../../utils/class-names";
import { getViewAnimation } from "./motion";
import { ICONS } from "./data";
import { getReceiptView } from "./receipt-view";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import styles from "../../styles/components/checkout/receipt.module.css";
import shared from "../../styles/components/checkout/index.module.css";

export const CheckoutReceipt = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, goTo, startResend } = checkout;
  const receipt = getReceiptView(checkout, view);

  return (
    <div
      className={joinClassNames(
        shared.viewGap18,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div className={styles.receipt}>
        <div className={styles.receiptStylist}>{receipt.stylist}</div>
        <div className={styles.receiptAddr}>{receipt.address}</div>
        {!!receipt.vat && (
          <div
            className={styles.receiptMeta}
          >{`VAT number ${receipt.vat}`}</div>
        )}
        <div className={styles.receiptNo}>
          <span>{receipt.number}</span>
          <span>{receipt.date}</span>
        </div>
        <div className={styles.receiptMeta}>{receipt.client}</div>
        <div className={styles.receiptLines}>
          {receipt.lines.map(({ key, label, value, isAdjust }) => (
            <div
              key={key}
              className={joinClassNames(
                shared.receiptLine,
                isAdjust ? styles.receiptLineAdjust : styles.receiptLineItem,
              )}
            >
              <span>{label}</span>
              <span className={shared.numeric}>{value}</span>
            </div>
          ))}
        </div>
        <div className={styles.receiptTotals}>
          <div className={styles.receiptRow}>
            <span>Subtotal</span>
            <span className={shared.numeric}>{receipt.subtotal}</span>
          </div>
          {!!receipt.tip && (
            <div className={styles.receiptRow}>
              <span>Tip</span>
              <span className={shared.numeric}>{receipt.tip}</span>
            </div>
          )}
          {receipt.pays.map(({ key, label, subtitle, value }) => (
            <div key={key} className={styles.receiptRow}>
              <span className={shared.minWidth}>
                {label}
                <span className={styles.receiptRowSub}>{subtitle}</span>
              </span>
              <span className={shared.numeric}>{value}</span>
            </div>
          ))}
          {!!receipt.fee && (
            <div className={styles.receiptRow}>
              <span>
                Booking fee
                <span className={styles.receiptRowSub}>paid at booking</span>
              </span>
              <span className={shared.numeric}>{receipt.fee}</span>
            </div>
          )}
        </div>
        <div className={styles.receiptPaid}>
          <span>Total paid</span>
          <span className={shared.numeric}>{receipt.paid}</span>
        </div>
        <div className={styles.receiptAddr}>{`Paid by ${receipt.method}`}</div>
      </div>
      <button
        className={styles.resend}
        onClick={() => {
          startResend("email");
          setState({ isResendFromReceipt: true });
          goTo("resend", 1);
        }}
      >
        <ICONS.send size={16} strokeWidth={1.7} />
        Resend receipt
      </button>
    </div>
  );
};
