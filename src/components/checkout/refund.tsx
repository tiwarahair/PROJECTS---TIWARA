import { CircleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getViewAnimation } from "./detail";
import { REFUND_REASONS } from "./data";
import { RadioMark } from "./controls";
import { getRefundCheck } from "./view";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import styles from "../../styles/components/checkout/refund.module.css";
import shared from "../../styles/components/checkout/checkout-sheet.module.css";
import { formatMoney } from "../../utils/money";

export const CheckoutRefund = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { refundCap, refundCapAll, isOffPlatform, cardText } = view;
  const { state, setState, booking } = checkout;
  const refundError = getRefundCheck(checkout, view).error;
  const isReasonMissing = state.refundTried && !state.refundReason;

  const already =
    state.refunded > 0
      ? ` ${formatMoney(state.refunded)} already refunded.`
      : "";

  const isFull = state.refundKind === "full";
  const paidText = formatMoney(refundCapAll);
  const capText = formatMoney(refundCap);

  return (
    <div
      className={joinClassNames(
        shared.viewGap18,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div>
        <h2 className={shared.viewTitle}>{`Refund ${booking.first}`}</h2>
        <div className={styles.refundSub}>
          {isOffPlatform
            ? `${paidText} was recorded off the platform. Up to ${capText} can be recorded as refunded.${already}`
            : `${paidText} paid through Tiwára’s House by ${cardText}. Up to ${capText} can be refunded.${already}`}
        </div>
      </div>
      <div
        className={shared.stack10}
        role="radiogroup"
        aria-label="Refund amount"
      >
        <button
          className={joinClassNames(
            styles.refundFull,
            isFull ? shared.tileOn : shared.tileOff,
          )}
          role="radio"
          aria-checked={isFull ? "true" : "false"}
          onClick={() => setState({ refundKind: "full" })}
        >
          <RadioMark isOn={isFull} className={styles.refundRing} />
          <span
            className={joinClassNames(
              shared.strong16,
              isFull ? shared.textOn : shared.textOff,
            )}
          >
            {`Full refund (${formatMoney(refundCap)})`}
          </span>
        </button>
        <div
          className={joinClassNames(
            shared.optionCard,
            !isFull ? shared.tileOn : shared.tileOff,
          )}
        >
          <button
            className={styles.refundPartial}
            role="radio"
            aria-checked={!isFull ? "true" : "false"}
            onClick={() => setState({ refundKind: "partial" })}
          >
            <RadioMark isOn={!isFull} className={styles.refundRing} />
            <span
              className={joinClassNames(
                shared.strong16,
                !isFull ? shared.textOn : shared.textOff,
              )}
            >
              Partial refund
            </span>
          </button>
          {!isFull && (
            <label
              className={joinClassNames(styles.refundAmount, shared.motion)}
              data-ck-m="1"
            >
              <span className={shared.fieldLabel}>Amount</span>
              <span className={shared.moneyWrapNarrow}>
                <span className={shared.poundSign}>£</span>
                <input
                  className={joinClassNames(
                    styles.refundInput,
                    refundError ? styles.refundInputErr : styles.refundInputOk,
                  )}
                  inputMode="decimal"
                  value={state.refundAmount}
                  onChange={(event) =>
                    setState({
                      refundAmount: event.target.value
                        .replace(/[^0-9.]/g, "")
                        .slice(0, 7),
                    })
                  }
                  aria-invalid={refundError ? "true" : "false"}
                  placeholder="0.00"
                />
              </span>
              {!!refundError && (
                <span className={styles.refundError} role="alert">
                  <CircleAlert
                    className={shared.iconTop2}
                    size={15}
                    strokeWidth={1.5}
                  />
                  {refundError}
                </span>
              )}
            </label>
          )}
        </div>
      </div>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>Reason</span>
        <select
          className={joinClassNames(
            styles.refundSelect,
            isReasonMissing ? shared.borderErr : shared.borderOk,
          )}
          value={state.refundReason}
          onChange={(event) => setState({ refundReason: event.target.value })}
        >
          <option value="">Choose a reason</option>
          {REFUND_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
        {isReasonMissing && (
          <span className={shared.fieldError} role="alert">
            Choose a reason.
          </span>
        )}
      </label>
      {isOffPlatform && (
        <div className={styles.refundOff}>
          Recorded only, refund the client directly.
        </div>
      )}
    </div>
  );
};
