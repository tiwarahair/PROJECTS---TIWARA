import { joinClassNames } from "../../utils/class-names";
import { getViewAnimation } from "./detail";
import { ICONS } from "./data";
import type { TipChoice } from "./data";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/index.module.css";
import { formatMoney, roundToPence } from "../../utils/money";

const TIP_CHOICES: [TipChoice, string][] = [
  ["none", "No tip"],
  [10, "10%"],
  [15, "15%"],
  [20, "20%"],
  ["custom", "Custom"],
];

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
