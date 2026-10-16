import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { AmountRow, getViewAnimation } from "./checkout-detail";
import { ICONS } from "./checkout-data";
import type { TipChoice } from "./checkout-data";
import { RECORD_VIA_LABELS, getAdjustNote } from "./checkout-view";
import type { CheckoutViewModel, DetailRow } from "./checkout-view";
import type { CheckoutController } from "./use-checkout";
import flow from "../../styles/components/checkout-sheet/checkout-flow.module.css";
import shared from "../../styles/components/checkout-sheet/checkout-sheet.module.css";
import { formatMoney, roundToPence } from "../../utils/money";

const TIP_CHOICES: [TipChoice, string][] = [
  ["none", "No tip"],
  [10, "10%"],
  [15, "15%"],
  [20, "20%"],
  ["custom", "Custom"],
];

export const Chip = ({
  isOn,
  className,
  onPick,
  children,
}: {
  isOn: boolean;
  className: string | undefined;
  onPick: () => void;
  children: ReactNode;
}) => (
  <button
    className={joinClassNames(className, isOn ? shared.chipOn : shared.chipOff)}
    onClick={onPick}
    aria-pressed={isOn ? "true" : "false"}
  >
    {children}
  </button>
);

/** Radio ring and dot. */
export const RadioMark = ({
  isOn,
  className,
}: {
  isOn: boolean;
  className: string | undefined;
}) => (
  <span
    className={joinClassNames(className, isOn ? shared.ringOn : shared.ringOff)}
  >
    <span
      className={joinClassNames(
        shared.radioDot,
        isOn ? shared.dotOn : shared.dotOff,
      )}
    ></span>
  </span>
);

export const CheckoutTip = ({
  checkout: { state, setState, money },
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const isRecord = money.method === "record";

  const getTipSubtitle = (choice: TipChoice, isOn: boolean) => {
    if (typeof choice === "number")
      return formatMoney(roundToPence((money.items * choice) / 100));

    if (choice === "custom" && isOn && money.selectedTip > 0)
      return formatMoney(money.selectedTip);

    return " ";
  };

  return (
    <div
      className={joinClassNames(
        flow.viewGap20,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div>
        <h2 className={shared.viewTitle}>
          {isRecord ? "Tip received?" : "Add a tip?"}
        </h2>
        <div className={flow.viewSub}>
          {`Percentages of the ${formatMoney(money.items)} service total.`}
        </div>
      </div>
      <div className={flow.tipGrid} role="radiogroup" aria-label="Tip">
        {TIP_CHOICES.map(([choice, label]) => {
          const isOn = state.tip === choice;
          const subtitle = getTipSubtitle(choice, isOn);

          return (
            <button
              key={String(choice)}
              className={joinClassNames(
                flow.tipChip,
                isOn ? shared.chipOn : shared.chipOff,
              )}
              role="radio"
              aria-checked={isOn ? "true" : "false"}
              onClick={() => setState({ tip: choice })}
            >
              <span className={flow.tipLabel}>{label}</span>
              <span
                className={joinClassNames(
                  flow.tipSub,
                  isOn ? flow.tipSubOn : flow.tipSubOff,
                )}
              >
                {subtitle}
              </span>
            </button>
          );
        })}
      </div>
      {state.tip === "custom" && (
        <label
          className={joinClassNames(flow.tipCustom, shared.motion)}
          data-ck-m="1"
        >
          <span className={shared.fieldLabel}>Custom tip</span>
          <span className={shared.moneyWrapNarrow}>
            <span className={shared.poundSign}>£</span>
            <input
              className={flow.moneyInput}
              inputMode="decimal"
              value={state.tipCustom}
              onChange={(event) =>
                setState({
                  tipCustom: event.target.value
                    .replace(/[^0-9.]/g, "")
                    .slice(0, 6),
                })
              }
              placeholder="0.00"
            />
          </span>
        </label>
      )}
      <div className={flow.tipHelp}>
        {isRecord
          ? "Tips go 100% to you. Recorded only, no money moves through Tiwára’s House."
          : "Tips go 100% to you (card fees apply)."}
      </div>
      {money.method === "card" && (
        <div className={flow.cardNote}>
          <ICONS.card
            className={flow.iconTop3}
            size={16}
            color="var(--neutral-700)"
            strokeWidth={1.5}
          />
          <div className={flow.cardNoteText}>
            <span className={flow.cardNoteTitle}>
              {`Charging ${view.name}’s saved card?`}
            </span>
            Only add a tip your client has asked you to add.
          </div>
        </div>
      )}
    </div>
  );
};

export const CheckoutPay = ({
  checkout: { state, setState, money },
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const isCardOn = state.method === "card" && money.cardOk;

  const isLinkOn =
    state.method === "link" || (state.method === "card" && !money.cardOk);

  const isRecordOn = state.method === "record";

  const option = (
    isOn: boolean,
    title: string,
    subtitle: string,
    OptionIcon: LucideIcon,
    onPick: () => void,
    extra: ReactNode,
    isDisabled = false,
  ) => (
    <div
      className={joinClassNames(
        shared.optionCard,
        isOn ? shared.tileOn : shared.tileOff,
        isDisabled && shared.tileDisabled,
      )}
    >
      <button
        className={joinClassNames(
          flow.optionButton,
          isDisabled ? flow.cursorBlocked : flow.cursorPointer,
        )}
        role="radio"
        aria-checked={isOn ? "true" : "false"}
        disabled={isDisabled}
        onClick={onPick}
      >
        <RadioMark isOn={isOn} className={flow.radioRing} />
        <span className={shared.flexCell}>
          <span
            className={joinClassNames(
              flow.optionTitle,
              isOn ? shared.textOn : shared.textOff,
            )}
          >
            {title}
          </span>
          <span className={flow.optionSub}>{subtitle}</span>
        </span>
        <OptionIcon
          className={flow.optionIcon}
          size={20}
          color="var(--neutral-600)"
          strokeWidth={1.7}
        />
      </button>
      {extra}
    </div>
  );

  return (
    <div
      className={joinClassNames(
        shared.viewGap18,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <h2 className={shared.viewTitle}>{`How is ${view.name} paying?`}</h2>
      <div
        className={shared.stack10}
        role="radiogroup"
        aria-label="Payment method"
      >
        {option(
          isCardOn,
          "Charge saved card",
          money.cardOk ? view.cardText : "No saved card for this booking",
          ICONS.card,
          () => {
            if (money.cardOk) setState({ method: "card" });
          },
          null,
          !money.cardOk,
        )}
        {option(
          isLinkOn,
          "Send payment link",
          "By SMS or email. Opens a secure payment page with Apple Pay and Google Pay, where your client can add a tip.",
          ICONS.link,
          () => setState({ method: "link" }),
          isLinkOn && (
            <div
              className={joinClassNames(flow.linkOptions, shared.motion)}
              data-ck-m="1"
            >
              <div className={shared.chipRow}>
                {(
                  [
                    ["sms", "SMS"],
                    ["email", "Email"],
                  ] as const
                ).map(([via, label]) => (
                  <Chip
                    key={via}
                    isOn={state.linkVia === via}
                    className={flow.linkChip}
                    onPick={() => setState({ linkVia: via })}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
              <div className={flow.linkTo}>{`Sends to ${view.linkTarget}`}</div>
              {money.selectedTip > 0 && (
                <div className={flow.linkTipDrop}>
                  {`The ${formatMoney(money.selectedTip)} tip isn’t added. Your client can choose their own tip on the payment page.`}
                </div>
              )}
            </div>
          ),
        )}
        {option(
          isRecordOn,
          "Record payment",
          "Cash, bank transfer or your own card reader.",
          ICONS.cash,
          () => setState({ method: "record" }),
          isRecordOn && (
            <div
              className={joinClassNames(flow.recordOptions, shared.motion)}
              data-ck-m="1"
            >
              <div className={flow.chipWrap}>
                {(
                  [
                    ["cash", "Cash"],
                    ["bank", "Bank transfer"],
                    ["reader", "Own card reader"],
                  ] as const
                ).map(([via, label]) => (
                  <Chip
                    key={via}
                    isOn={state.recordVia === via}
                    className={flow.recordChip}
                    onPick={() => setState({ recordVia: via })}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
              {state.recordVia === "reader" && (
                <div className={flow.linkTo}>
                  SumUp, Square etc. Take the payment on your reader first.
                </div>
              )}
              <div className={flow.recordNote}>
                {"Recorded only, no money moves through Tiwára's House."}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export const CheckoutReview = ({
  checkout: { state, setState, money, booking, goTo },
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
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
          <span>{view.review.totalLabel}</span>
          <span className={shared.numeric}>{view.review.totalValue}</span>
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
