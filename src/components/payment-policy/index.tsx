import { Check, ChevronLeft } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { CancellationsSection } from "./cancellations-section";
import { ExtrasSection } from "./extras-section";
import { Preview } from "./preview";
import { ProtectionSection } from "./protection-section";
import { getExistingNote, getPolicySummary } from "./summary";
import type { PaymentPolicyProps } from "./types";
import { usePaymentPolicy } from "./use-payment-policy";
import styles from "../../styles/components/payment-policy/index.module.css";
import parts from "../../styles/components/payment-policy/parts.module.css";

export type { PaymentPolicyApi, PaymentPolicyProps } from "./types";

/**
 * Studio → Settings → Payment & cancellation policy: booking protection,
 * cancellation window and fees, grace period, additional policies (300 characters shared), a live client preview
 * and a save bar.
 */
export const PaymentPolicy = (props: PaymentPolicyProps) => {
  const {
    embedded = false,
    hideSave = false,
    bookingsCount,
    stylistName,
  } = props;

  const controller = usePaymentPolicy(props);
  const { policy, isDirty, isFlashing, hasError, canSave, save } = controller;

  return (
    <div
      className={styles.root}
      data-pp-emb={embedded ? "1" : "0"}
      data-pp-hidesave={hideSave ? "1" : "0"}
      data-screen-label="Payment and cancellation policy"
    >
      <div className={styles.scroll} data-pp-scroll="1">
        <div className={styles.pad} data-pp-pad="1">
          {!embedded && (
            <>
              <button className={styles.back}>
                <ChevronLeft size={20} strokeWidth={2} />
                Settings
              </button>
              <h1 className={styles.title}>Payment & cancellation policy</h1>
            </>
          )}

          <div className={styles.columns} data-pp-cols="1">
            <div className={styles.main}>
              <ProtectionSection policy={controller} />
              <CancellationsSection policy={controller} />
              <ExtrasSection policy={controller} />
            </div>

            <Preview policy={policy} stylistName={stylistName} />
          </div>
        </div>
      </div>

      <div
        className={styles.saveBar}
        data-pp-bar="1"
        data-screen-label="Save bar"
      >
        <div className={styles.barInner} data-pp-barin="1">
          <div className={styles.barText}>
            <div className={styles.barHead}>
              {hasError && (
                <span
                  className={joinClassNames(
                    styles.status,
                    styles.statusColours,
                  )}
                >
                  Fix the error to save
                </span>
              )}
              <span
                className={styles.summary}
                data-pp-sum="1"
                title={getPolicySummary(policy)}
              >
                {getPolicySummary(policy)}
              </span>
            </div>
            <div className={styles.existing}>
              {getExistingNote(bookingsCount)}
            </div>
          </div>
          <button
            className={joinClassNames(
              styles.saveButton,
              parts.focusRing,
              canSave ? styles.saveOn : styles.saveOff,
            )}
            data-pp-in="1"
            data-pp-savebtn="1"
            disabled={!canSave}
            onClick={save}
          >
            {isFlashing && <Check size={17} strokeWidth={2} />}
            {isFlashing && !isDirty ? "Saved" : "Save policy"}
          </button>
        </div>
      </div>
    </div>
  );
};
