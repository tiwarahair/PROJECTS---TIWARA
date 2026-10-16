import { ArrowDownToLine } from "lucide-react";
import { downloadFile } from "../../../utils/download-file";
import { getReceiptHtml } from "../logic";
import type { AccountController } from "../use-account";
import type { AccountView } from "../view";
import shared from "../../../styles/features/account/dialogs/index.module.css";
import styles from "../../../styles/features/account/dialogs/receipt.module.css";
import ui from "../../../styles/features/account/ui.module.css";

const EMPTY_RECEIPT = {
  ref: "",
  date: "",
  stylist: "",
  where: "",
  total: "",
  lines: [],
  payments: [],
};

interface ReceiptDialogProps {
  account: AccountController;
  view: AccountView;
}

export const ReceiptDialog = ({
  account: { state, actions },
  view: { receipt },
}: ReceiptDialogProps) => {
  const receiptView = receipt ?? EMPTY_RECEIPT;

  return (
    <div data-screen-label="Receipt">
      <h2 className={styles.receiptTitle} id="ac-dlg-t">
        Receipt
      </h2>
      <div className={styles.receiptRef}>
        {receiptView.ref}
        {" · "}
        {receiptView.date}
      </div>
      <div className={styles.receiptStylist}>{receiptView.stylist}</div>
      <div className={ui.muted}>{receiptView.where}</div>
      <div className={styles.receiptLines}>
        {receiptView.lines.map(({ label, subtitle, amount }, index) => (
          <div key={index} className={styles.receiptLine}>
            <span className={styles.lineLabel}>
              {label}
              {!!subtitle && <span className={styles.lineSub}>{subtitle}</span>}
            </span>
            <span className={styles.amount}>{amount}</span>
          </div>
        ))}
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.amount}>{receiptView.total}</span>
        </div>
      </div>
      <div className={styles.pays}>
        {receiptView.payments.map(({ label, amount }, index) => (
          <div key={index} className={styles.pay}>
            <span>{label}</span>
            <span className={styles.payAmount}>{amount}</span>
          </div>
        ))}
      </div>
      <div className={styles.receiptActions}>
        <button
          className={styles.download}
          onClick={() => {
            if (!receipt) return;

            downloadFile(
              `receipt-${receipt.ref}.html`,
              getReceiptHtml(receipt, state.profile),
              "text/html",
            );

            actions.showToast("Receipt downloaded");
          }}
        >
          <ArrowDownToLine size={17} strokeWidth={1.7} />
          Download
        </button>
        <button className={shared.secondary} onClick={actions.closeDialog}>
          Close
        </button>
      </div>
    </div>
  );
};
