import { Plus } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { AmountRow, getViewAnimation } from "./detail";
import { ICONS } from "./data";
import { RECORD_VIA_LABELS, getAdjustNote, getReviewTotal } from "./view";
import type { CheckoutViewModel, DetailRow } from "./view";
import type { CheckoutController } from "./use-checkout";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/checkout-sheet.module.css";
import { formatMoney } from "../../utils/money";

export const CheckoutReview = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, money, booking, goTo } = checkout;
  const reviewTotal = getReviewTotal(checkout, view);
  const extraRows: DetailRow[] = [];

  const getTipRowSubtitle = () => {
    if (state.method === "record") return "Received in person";

    if (typeof state.tip === "number")
      return `${state.tip}% of ${formatMoney(money.items)}`;

    return "Custom amount";
  };

  const getMethod = () => {
    if (money.method === "card")
      return { icon: ICONS.card, label: "Saved card", subtitle: view.cardText };

    if (money.method === "link")
      return {
        icon: ICONS.link,
        label: `Payment link by ${state.linkVia === "sms" ? "SMS" : "email"}`,
        subtitle: state.linkVia === "sms" ? booking.phone : booking.email,
      };

    return {
      icon: ICONS.cash,
      label: `${RECORD_VIA_LABELS[state.recordVia] || ""}, recorded`,
      subtitle: "Recorded only, no money moves through Tiwára’s House.",
    };
  };

  if (money.tip > 0)
    extraRows.push({
      key: `Tip${formatMoney(money.tip)}`,
      label: "Tip",
      subtitle: getTipRowSubtitle(),
      value: formatMoney(money.tip),
      isAlert: false,
    });

  extraRows.push(...view.creditRows);
  const method = getMethod();
  const { icon: MethodIcon } = method;
  const isHard = state.decline === "hard";

  return (
    <div
      className={joinClassNames(
        flow.viewGap22,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      {!!state.decline && (
        <div
          className={joinClassNames(flow.declined, shared.motion)}
          role="alert"
          data-ck-m="1"
        >
          <div className={flow.declinedHead}>
            <ICONS.alert
              className={shared.iconTop2}
              size={18}
              color="var(--accent-700)"
              strokeWidth={1.7}
            />
            <div>
              <div className={flow.declinedTitle}>
                {isHard
                  ? "Card declined: reported lost or stolen"
                  : "Card declined: insufficient funds"}
              </div>
              <div className={flow.declinedBody}>
                {isHard
                  ? `${view.cardText} can’t be charged again. Send ${view.name} a payment link or record another payment.`
                  : `${view.name}’s bank declined ${view.cardText}. You can retry once more, or take payment another way.`}
              </div>
            </div>
          </div>
          <div className={flow.chipWrap}>
            <button
              className={flow.declinedButton}
              onClick={() => setState({ method: "link", decline: null })}
            >
              Send payment link
            </button>
            <button
              className={flow.declinedButton}
              onClick={() => {
                setState({ method: "record", decline: null });
                goTo("pay", -1);
              }}
            >
              Record payment
            </button>
          </div>
        </div>
      )}
      <h2 className={shared.viewTitle}>Review</h2>
      <div>
        {state.lines.map((line) => (
          <div key={`r${line.id}`} className={flow.row}>
            <span className={shared.minWidth}>
              <span className={flow.rowLabel}>{line.name}</span>
              {!!line.adjustment && (
                <span className={flow.rowSub}>{getAdjustNote(line)}</span>
              )}
            </span>
            <span className={flow.reviewValue}>
              {!!line.adjustment && (
                <span className={flow.reviewWas}>{formatMoney(line.base)}</span>
              )}
              <span className={flow.reviewAmount}>
                {formatMoney(line.base + line.adjustment)}
              </span>
            </span>
          </div>
        ))}
        {extraRows.map((row) => (
          <AmountRow key={row.key} row={row} subtitleClassName={flow.rowSub} />
        ))}
        <div className={flow.totalLarge}>
          <span>{reviewTotal.label}</span>
          <span className={shared.numeric}>{reviewTotal.value}</span>
        </div>
      </div>
      {money.method !== "none" && (
        <div>
          <div className={flow.sectionLabelLoose}>Payment method</div>
          <div className={flow.rowCenter}>
            <span className={flow.methodIcon}>
              <MethodIcon
                size={18}
                color="var(--neutral-700)"
                strokeWidth={1.7}
              />
            </span>
            <div className={shared.flexCell}>
              <div className={flow.strong15}>{method.label}</div>
              <div className={flow.methodSub}>{method.subtitle}</div>
            </div>
            <button
              className={flow.changeMethod}
              onClick={() => goTo("pay", -1)}
            >
              Change
            </button>
          </div>
        </div>
      )}
      {money.method === "none" && !view.isRefund && (
        <div className={flow.nothing}>
          <div className={flow.strong15}>Nothing to pay</div>
          <div className={flow.nothingText}>
            {`${view.name} has already paid ${formatMoney(state.paid)}.`}
          </div>
        </div>
      )}
      {view.isRefund && (
        <div className={flow.reviewRefund}>
          <ICONS.returnArrow
            className={flow.iconTop3}
            size={16}
            strokeWidth={1.7}
          />
          <span>{view.refundNote}</span>
        </div>
      )}
      {money.method === "none" && !money.steps.includes("tip") && (
        <button
          className={flow.addTip}
          onClick={() => {
            setState({ tipOpen: true });
            goTo("pay", 1);
          }}
        >
          <Plus size={15} strokeWidth={1.7} />
          Add a tip
        </button>
      )}
      <div className={flow.reviewNotes}>
        {money.cardFee > 0 && (
          <span>{`Card fee of about ${formatMoney(money.cardFee, { pence: "always" })} is deducted from your payout.`}</span>
        )}
        {money.method === "link" && (
          <span>{`${view.name} can choose their own tip on the payment page. The booking shows Awaiting payment until they pay.`}</span>
        )}
        <span>
          {money.method === "link"
            ? `A review request goes to ${view.name} automatically.`
            : `A receipt and review request go to ${view.name} automatically.`}
        </span>
      </div>
    </div>
  );
};
