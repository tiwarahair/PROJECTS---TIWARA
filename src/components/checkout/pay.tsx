import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getViewAnimation } from "./detail";
import { Chip, RadioMark } from "./controls";
import { ICONS } from "./data";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/checkout-sheet.module.css";
import { formatMoney } from "../../utils/money";

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
