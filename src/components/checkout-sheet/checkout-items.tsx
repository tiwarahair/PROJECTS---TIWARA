import { joinClassNames } from "../../utils/class-names";
import { AmountRow, Icon, getViewAnimation } from "./checkout-detail";
import {
  ADJUST_REASONS,
  DEFAULT_MENU,
  formatPounds,
  parsePounds,
  roundPounds,
} from "./checkout-data";
import { getAdjustNote } from "./checkout-view";
import type { CheckoutLine } from "./checkout-data";
import type { CheckoutViewModel } from "./checkout-view";
import type { CheckoutController, CheckoutSheetProps } from "./use-checkout";
import flow from "./checkout-flow.module.css";
import shared from "./checkout-sheet.module.css";

const PLUS = "M12 5v14M5 12h14";

const getAdjustReason = ({ adjustment, reason }: CheckoutLine) => {
  if (!adjustment) return "";

  return ADJUST_REASONS.includes(reason) ? reason : "Other";
};

export const CheckoutItems = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, booking, showToast, goTo } = checkout;
  const line = state.lines.find(({ id }) => id === state.adjustingLineId);

  const adjustPreview = (() => {
    if (!line || String(state.adjustmentAmount).trim() === "") return "";

    const delta = roundPounds(parsePounds(state.adjustmentAmount) - line.base);

    return delta === 0
      ? "Same as booked price"
      : (delta < 0 ? "Lowered by " : "Raised by ") +
          formatPounds(Math.abs(delta));
  })();

  const applyAdjustment = () => {
    if (!line) return;

    const delta = roundPounds(parsePounds(state.adjustmentAmount) - line.base);
    let error = "";

    if (String(state.adjustmentAmount).trim() === "")
      error = "Enter the new price.";
    else if (delta === 0)
      error = `That’s the booked price. Enter a different amount.`;
    else if (!state.adjustmentReason) error = "Choose a reason.";
    else if (
      state.adjustmentReason === "Other" &&
      !state.adjustmentOther.trim()
    )
      error = "Describe the reason.";

    if (error) return setState({ adjustmentError: error });

    const reason =
      state.adjustmentReason === "Other"
        ? state.adjustmentOther.trim()
        : state.adjustmentReason;

    setState({
      lines: state.lines.map((item) =>
        item.id === line.id ? { ...item, adjustment: delta, reason } : item,
      ),
      adjustingLineId: null,
    });

    showToast("Price adjusted");
  };

  return (
    <div
      className={joinClassNames(
        flow.viewGap26,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div className={flow.rowCenter}>
        <span className={flow.avatar}>
          {booking.client
            .split(" ")
            .map((word) => word[0])
            .join("")}
        </span>
        <div className={shared.flexCell}>
          <div className={shared.strong16}>{booking.client}</div>
          <div className={flow.itemsWhen}>
            {`${booking.day}, ${booking.time}`}
          </div>
        </div>
        <span className={flow.modeTag}>{view.modeLabel}</span>
      </div>
      <div>
        <div className={flow.sectionLabelTight}>Items</div>
        {state.lines.map((item) => {
          const isAdjusting = state.adjustingLineId === item.id;

          return (
            <div key={`i${item.id}`} className={flow.itemRow}>
              <div className={flow.itemHead}>
                <div className={shared.minWidth}>
                  <div className={flow.itemName}>{item.name}</div>
                  <div className={flow.itemSub}>{item.subtitle}</div>
                </div>
                <div className={flow.itemPriceCell}>
                  {!!item.adjustment && (
                    <div className={flow.itemWas}>
                      {formatPounds(item.base)}
                    </div>
                  )}
                  <div className={flow.itemPrice}>
                    {formatPounds(item.base + item.adjustment)}
                  </div>
                </div>
              </div>
              {!!item.adjustment && (
                <div className={flow.itemNote}>{getAdjustNote(item)}</div>
              )}
              <div className={flow.itemActions}>
                <button
                  className={joinClassNames(
                    flow.itemAdjust,
                    isAdjusting ? flow.adjustActive : flow.adjustIdle,
                  )}
                  onClick={() =>
                    setState({
                      adjustingLineId: item.id,
                      adjustmentAmount: item.adjustment
                        ? String(item.base + item.adjustment)
                        : "",
                      adjustmentReason: getAdjustReason(item),
                      adjustmentOther:
                        item.adjustment && !ADJUST_REASONS.includes(item.reason)
                          ? item.reason
                          : "",
                      adjustmentError: "",
                    })
                  }
                >
                  {isAdjusting ? "Adjusting" : "Adjust price"}
                </button>
                {item.added && (
                  <button
                    className={flow.itemRemove}
                    onClick={() =>
                      setState({
                        lines: state.lines.filter(({ id }) => id !== item.id),
                        adjustingLineId: isAdjusting
                          ? null
                          : state.adjustingLineId,
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {line && (
          <div
            className={joinClassNames(flow.adjustPanel, shared.motion)}
            data-ck-m="1"
          >
            <div className={flow.strong15}>
              {`Adjust ${line.name} (${formatPounds(line.base)})`}
            </div>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>New price</span>
              <span className={flow.moneyWrap}>
                <span className={shared.poundSign}>£</span>
                <input
                  className={flow.moneyInput}
                  inputMode="decimal"
                  value={state.adjustmentAmount}
                  onChange={(event) =>
                    setState({
                      adjustmentAmount: event.target.value
                        .replace(/[^0-9.]/g, "")
                        .slice(0, 7),
                      adjustmentError: "",
                    })
                  }
                  placeholder="0.00"
                />
              </span>
            </label>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>Reason</span>
              <select
                className={flow.select}
                value={state.adjustmentReason}
                onChange={(event) =>
                  setState({
                    adjustmentReason: event.target.value,
                    adjustmentError: "",
                  })
                }
              >
                <option value="">Choose a reason</option>
                {ADJUST_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <span className={shared.muted135}>Shown on the receipt.</span>
            </label>
            {state.adjustmentReason === "Other" && (
              <input
                className={flow.textInput}
                value={state.adjustmentOther}
                onChange={(event) =>
                  setState({
                    adjustmentOther: event.target.value.slice(0, 60),
                    adjustmentError: "",
                  })
                }
                aria-label="Describe the reason"
                placeholder="Describe the reason"
              />
            )}
            {!!state.adjustmentError && (
              <div className={flow.adjustError} role="alert">
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
                {state.adjustmentError}
              </div>
            )}
            <div className={flow.adjustFoot}>
              <div className={flow.adjustPreview}>{adjustPreview}</div>
              {!!line.adjustment && (
                <button
                  className={flow.adjustReset}
                  onClick={() => {
                    setState({
                      lines: state.lines.map((item) =>
                        item.id === line.id
                          ? { ...item, adjustment: 0, reason: "" }
                          : item,
                      ),
                      adjustingLineId: null,
                    });

                    showToast("Adjustment removed");
                  }}
                >
                  Remove adjustment
                </button>
              )}
              <button
                className={flow.adjustCancel}
                onClick={() => setState({ adjustingLineId: null })}
              >
                Cancel
              </button>
              <button className={flow.adjustApply} onClick={applyAdjustment}>
                Apply
              </button>
            </div>
          </div>
        )}
        <button className={flow.addItem} onClick={() => goTo("add", 1)}>
          <Icon path={PLUS} size={16} strokeWidth="1.7" isRound={false} />
          Add item
        </button>
      </div>
      <div>
        <div className={flow.rowTotal}>
          <span>Total</span>
          <span className={shared.numeric}>
            {formatPounds(checkout.money.items)}
          </span>
        </div>
        {view.creditRows.map((row) => (
          <AmountRow key={row.key} row={row} subtitleClassName={flow.rowSub} />
        ))}
        <div className={flow.totalLarge}>
          <span>{view.balanceLabel}</span>
          <span className={shared.numeric}>{view.balanceValue}</span>
        </div>
        {view.isRefund && (
          <div className={flow.refundNote}>
            <Icon
              className={flow.iconTop3}
              path="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"
              size={16}
              strokeWidth="1.7"
            />
            <span>{view.refundNote}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const CheckoutAdd = ({
  checkout: { state, setState, goTo, showToast },
  menu,
}: {
  checkout: CheckoutController;
  menu: CheckoutSheetProps["menu"];
}) => (
  <div
    className={joinClassNames(
      flow.viewGap24,
      shared.motion,
      getViewAnimation(state.direction),
    )}
    data-ck-m="1"
  >
    {(menu || DEFAULT_MENU).map(({ title, rows }) => (
      <div key={title}>
        <div className={flow.sectionLabelLoose}>{title}</div>
        <div className={flow.stack8}>
          {rows.map(([name, price, meta]) => (
            <button
              key={name}
              className={flow.addRow}
              onClick={() => {
                const id = state.nextLineId;

                setState({
                  lines: state.lines.concat([
                    {
                      id,
                      name,
                      subtitle: title === "Add-ons" ? "Add-on" : "Service",
                      base: price,
                      adjustment: 0,
                      reason: "",
                      added: true,
                    },
                  ]),
                  nextLineId: id + 1,
                });

                goTo("items", -1);
                showToast(`${name} added`);
              }}
            >
              <span className={shared.flexCell}>
                <span className={flow.addName}>{name}</span>
                <span className={flow.addMeta}>{meta}</span>
              </span>
              <span className={flow.addPrice}>{formatPounds(price)}</span>
              <Icon
                path={PLUS}
                size={18}
                stroke="var(--accent-700)"
                strokeWidth="1.7"
                isRound={false}
              />
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);
