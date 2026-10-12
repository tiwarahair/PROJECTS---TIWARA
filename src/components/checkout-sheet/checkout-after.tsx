import { joinClassNames } from "../../utils/class-names";
import { Icon, getViewAnimation } from "./checkout-detail";
import { ICONS, REFUND_REASONS, formatPounds } from "./checkout-data";
import { Chip, RadioMark } from "./checkout-payment";
import { RECORD_VIA_LABELS } from "./checkout-view";
import type { CheckoutViewModel } from "./checkout-view";
import type { CheckoutController } from "./use-checkout";
import after from "./checkout-after.module.css";
import shared from "./checkout-sheet.module.css";

export const CheckoutDone = ({
  checkout: { state, setState, goTo, booking },
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { done, receipt, name, cardText } = view;

  const linkTarget =
    state.linkVia === "sms"
      ? `SMS to ${booking.phone}`
      : `email to ${booking.email}`;

  const getSummary = () => {
    if (done.method === "card")
      return `${formatPounds(done.charged)} charged to ${cardText}.`;

    if (done.method === "link")
      return `Payment link for ${formatPounds(done.charged)} sent by ${linkTarget}.`;

    if (done.method === "record")
      return `${formatPounds(done.charged)} ${(RECORD_VIA_LABELS[done.via] || "").toLowerCase()} recorded.`;

    if (done.refundAuto > 0)
      return `${formatPounds(done.refundAuto)} refund on its way to ${cardText}.`;

    return `Nothing to pay. ${name} had already paid.`;
  };

  const summary = getSummary();

  return (
    <div className={after.doneView}>
      <span
        className={joinClassNames(after.doneTick, shared.motion)}
        data-ck-m="1"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className={after.doneTickPath} d="M20 6 9 17l-5-5"></path>
        </svg>
      </span>
      <div
        className={joinClassNames(after.doneHead, shared.motion)}
        data-ck-m="1"
      >
        <h2 className={after.doneTitle}>Checkout complete</h2>
        <div className={after.doneSub}>{summary}</div>
        {done.method === "link" && (
          <span className={after.awaitingTag}>
            <Icon path={ICONS.clock} size={14} strokeWidth="2" />
            Completed · Awaiting payment
          </span>
        )}
      </div>
      <div
        className={joinClassNames(after.doneReceipt, shared.motion)}
        data-ck-m="1"
      >
        <div className={after.doneReceiptHead}>
          <span className={after.doneStylist}>{receipt.stylist}</span>
          <span>{receipt.date}</span>
        </div>
        <div className={after.doneLines}>
          {receipt.lines.map(({ key, label, value, isAdjust }) => (
            <div
              key={key}
              className={joinClassNames(
                after.receiptLine,
                isAdjust ? after.doneLineAdjust : after.doneLineItem,
              )}
            >
              <span>{label}</span>
              <span className={shared.numeric}>{value}</span>
            </div>
          ))}
          {!!receipt.tip && (
            <div className={after.doneExtra}>
              <span>Tip</span>
              <span className={shared.numeric}>{receipt.tip}</span>
            </div>
          )}
          {!!receipt.fee && (
            <div className={after.doneExtra}>
              <span>Booking fee, paid at booking</span>
              <span className={shared.numeric}>{receipt.fee}</span>
            </div>
          )}
        </div>
        <div className={after.donePaid}>
          <span>Total paid</span>
          <span className={shared.numeric}>{receipt.paid}</span>
        </div>
        <div className={after.doneMethod}>{receipt.method}</div>
        <button
          className={after.viewReceipt}
          onClick={() => {
            setState({ fromDone: true });
            goTo("receipt", 1);
          }}
        >
          View full receipt
        </button>
      </div>
      <div className={after.doneNote}>
        {done.method === "link"
          ? `${name} gets a receipt once they pay. A review request goes to them automatically.`
          : `A review request goes to ${name} automatically.`}
      </div>
    </div>
  );
};

export const CheckoutReceipt = ({
  checkout: { state, setState, goTo, booking },
  view: { receipt },
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => (
  <div
    className={joinClassNames(
      shared.viewGap18,
      shared.motion,
      getViewAnimation(state.direction),
    )}
    data-ck-m="1"
  >
    <div className={after.receipt}>
      <div className={after.receiptStylist}>{receipt.stylist}</div>
      <div className={after.receiptAddr}>{receipt.address}</div>
      {!!receipt.vat && (
        <div className={after.receiptMeta}>{`VAT number ${receipt.vat}`}</div>
      )}
      <div className={after.receiptNo}>
        <span>{receipt.number}</span>
        <span>{receipt.date}</span>
      </div>
      <div className={after.receiptMeta}>{receipt.client}</div>
      <div className={after.receiptLines}>
        {receipt.lines.map(({ key, label, value, isAdjust }) => (
          <div
            key={key}
            className={joinClassNames(
              after.receiptLine,
              isAdjust ? after.receiptLineAdjust : after.receiptLineItem,
            )}
          >
            <span>{label}</span>
            <span className={shared.numeric}>{value}</span>
          </div>
        ))}
      </div>
      <div className={after.receiptTotals}>
        <div className={after.receiptRow}>
          <span>Subtotal</span>
          <span className={shared.numeric}>{receipt.subtotal}</span>
        </div>
        {!!receipt.tip && (
          <div className={after.receiptRow}>
            <span>Tip</span>
            <span className={shared.numeric}>{receipt.tip}</span>
          </div>
        )}
        {receipt.pays.map(({ key, label, subtitle, value }) => (
          <div key={key} className={after.receiptRow}>
            <span className={shared.minWidth}>
              {label}
              <span className={after.receiptRowSub}>{subtitle}</span>
            </span>
            <span className={shared.numeric}>{value}</span>
          </div>
        ))}
        {!!receipt.fee && (
          <div className={after.receiptRow}>
            <span>
              Booking fee
              <span className={after.receiptRowSub}>paid at booking</span>
            </span>
            <span className={shared.numeric}>{receipt.fee}</span>
          </div>
        )}
      </div>
      <div className={after.receiptPaid}>
        <span>Total paid</span>
        <span className={shared.numeric}>{receipt.paid}</span>
      </div>
      <div className={after.receiptAddr}>{`Paid by ${receipt.method}`}</div>
    </div>
    <button
      className={after.resend}
      onClick={() => {
        setState({ resendVia: "email", resendTo: booking.email });
        goTo("resend", 1);
      }}
    >
      <Icon path={ICONS.send} size={16} strokeWidth="1.7" />
      Resend receipt
    </button>
  </div>
);

export const CheckoutResend = ({
  checkout: { state, setState, booking },
}: {
  checkout: CheckoutController;
}) => {
  const hasError = state.resendTried && !state.resendTo.trim();

  return (
    <div
      className={joinClassNames(
        shared.viewGap18,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div className={after.resendIntro}>
        {`Send ${booking.first} a copy of the receipt for ${booking.day}, ${booking.time}.`}
      </div>
      <div className={shared.chipRow}>
        {(
          [
            ["email", "Email"],
            ["sms", "SMS"],
          ] as const
        ).map(([via, label]) => (
          <Chip
            key={via}
            isOn={state.resendVia === via}
            className={after.resendChip}
            onPick={() =>
              setState({
                resendVia: via,
                resendTo: via === "email" ? booking.email : booking.phone,
                resendTried: false,
              })
            }
          >
            {label}
          </Chip>
        ))}
      </div>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>
          {state.resendVia === "email" ? "Email address" : "Mobile number"}
        </span>
        <input
          className={joinClassNames(
            after.resendInput,
            hasError ? after.borderErr : after.borderOk,
          )}
          type={state.resendVia === "email" ? "email" : "tel"}
          value={state.resendTo}
          onChange={(event) => setState({ resendTo: event.target.value })}
        />
        {hasError && (
          <span className={after.fieldError} role="alert">
            Enter where to send it.
          </span>
        )}
        <span className={shared.note13}>
          {`Edit it to send this receipt somewhere else. ${booking.first}’s profile isn’t changed.`}
        </span>
      </label>
    </div>
  );
};

export const CheckoutRefund = ({
  checkout: { state, setState, booking },
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { refundCap, refundCapAll, isOffPlatform, cardText } = view;
  const refundError = view.refund.error;
  const isReasonMissing = state.refundTried && !state.refundReason;

  const already =
    state.refunded > 0
      ? ` ${formatPounds(state.refunded)} already refunded.`
      : "";

  const isFull = state.refundKind === "full";
  const paidText = formatPounds(refundCapAll);
  const capText = formatPounds(refundCap);

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
        <div className={after.refundSub}>
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
            after.refundFull,
            isFull ? shared.tileOn : shared.tileOff,
          )}
          role="radio"
          aria-checked={isFull ? "true" : "false"}
          onClick={() => setState({ refundKind: "full" })}
        >
          <RadioMark isOn={isFull} className={after.refundRing} />
          <span
            className={joinClassNames(
              shared.strong16,
              isFull ? shared.textOn : shared.textOff,
            )}
          >
            {`Full refund (${formatPounds(refundCap)})`}
          </span>
        </button>
        <div
          className={joinClassNames(
            shared.optionCard,
            !isFull ? shared.tileOn : shared.tileOff,
          )}
        >
          <button
            className={after.refundPartial}
            role="radio"
            aria-checked={!isFull ? "true" : "false"}
            onClick={() => setState({ refundKind: "partial" })}
          >
            <RadioMark isOn={!isFull} className={after.refundRing} />
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
              className={joinClassNames(after.refundAmount, shared.motion)}
              data-ck-m="1"
            >
              <span className={shared.fieldLabel}>Amount</span>
              <span className={shared.moneyWrapNarrow}>
                <span className={shared.poundSign}>£</span>
                <input
                  className={joinClassNames(
                    after.refundInput,
                    refundError ? after.refundInputErr : after.refundInputOk,
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
                <span className={after.refundError} role="alert">
                  <svg
                    className={shared.iconTop2}
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 7v6M12 16.5v.5"></path>
                  </svg>
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
            after.refundSelect,
            isReasonMissing ? after.borderErr : after.borderOk,
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
          <span className={after.fieldError} role="alert">
            Choose a reason.
          </span>
        )}
      </label>
      {isOffPlatform && (
        <div className={after.refundOff}>
          Recorded only, refund the client directly.
        </div>
      )}
    </div>
  );
};
