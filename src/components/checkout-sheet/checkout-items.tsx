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
import type { CheckoutViewModel } from "./checkout-view";
import type { CheckoutController, CheckoutSheetProps } from "./use-checkout";
import flow from "./checkout-flow.module.css";
import shared from "./checkout-sheet.module.css";

const PLUS = "M12 5v14M5 12h14";

export const CheckoutItems = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, booking, showToast, go } = checkout;
  const line = state.lines.find(({ id }) => id === state.adjId);
  const adjustPreview = (() => {
    if (!line || String(state.adjAmt).trim() === "") return "";
    const delta = roundPounds(parsePounds(state.adjAmt) - line.base);
    return delta === 0
      ? "Same as booked price"
      : (delta < 0 ? "Lowered by " : "Raised by ") +
          formatPounds(Math.abs(delta));
  })();
  const applyAdjustment = () => {
    if (!line) return;
    const delta = roundPounds(parsePounds(state.adjAmt) - line.base);
    let error = "";
    if (String(state.adjAmt).trim() === "") error = "Enter the new price.";
    else if (delta === 0)
      error = `That’s the booked price. Enter a different amount.`;
    else if (!state.adjReason) error = "Choose a reason.";
    else if (state.adjReason === "Other" && !state.adjOther.trim())
      error = "Describe the reason.";
    if (error) return setState({ adjErr: error });
    const reason =
      state.adjReason === "Other" ? state.adjOther.trim() : state.adjReason;
    setState({
      lines: state.lines.map((item) =>
        item.id === line.id ? { ...item, adj: delta, reason } : item,
      ),
      adjId: null,
    });
    showToast("Price adjusted");
  };

  return (
    <div
      className={joinClassNames(
        flow.viewGap26,
        shared.motion,
        getViewAnimation(state.dir),
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
            {booking.day + ", " + booking.time}
          </div>
        </div>
        <span className={flow.modeTag}>{view.modeLabel}</span>
      </div>
      <div>
        <div className={flow.sectionLabelTight}>Items</div>
        {state.lines.map((item) => {
          const isAdjusting = state.adjId === item.id;
          return (
            <div key={"i" + item.id} className={flow.itemRow}>
              <div className={flow.itemHead}>
                <div className={shared.minWidth}>
                  <div className={flow.itemName}>{item.name}</div>
                  <div className={flow.itemSub}>{item.sub}</div>
                </div>
                <div className={flow.itemPriceCell}>
                  {!!item.adj && (
                    <div className={flow.itemWas}>
                      {formatPounds(item.base)}
                    </div>
                  )}
                  <div className={flow.itemPrice}>
                    {formatPounds(item.base + item.adj)}
                  </div>
                </div>
              </div>
              {!!item.adj && (
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
                      adjId: item.id,
                      adjAmt: item.adj ? String(item.base + item.adj) : "",
                      adjReason: item.adj
                        ? ADJUST_REASONS.includes(item.reason)
                          ? item.reason
                          : "Other"
                        : "",
                      adjOther:
                        item.adj && !ADJUST_REASONS.includes(item.reason)
                          ? item.reason
                          : "",
                      adjErr: "",
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
                        adjId: isAdjusting ? null : state.adjId,
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
              {"Adjust " + line.name + " (" + formatPounds(line.base) + ")"}
            </div>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>New price</span>
              <span className={flow.moneyWrap}>
                <span className={shared.poundSign}>£</span>
                <input
                  className={flow.moneyInput}
                  inputMode="decimal"
                  value={state.adjAmt}
                  onChange={(event) =>
                    setState({
                      adjAmt: event.target.value
                        .replace(/[^0-9.]/g, "")
                        .slice(0, 7),
                      adjErr: "",
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
                value={state.adjReason}
                onChange={(event) =>
                  setState({ adjReason: event.target.value, adjErr: "" })
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
            {state.adjReason === "Other" && (
              <input
                className={flow.textInput}
                value={state.adjOther}
                onChange={(event) =>
                  setState({
                    adjOther: event.target.value.slice(0, 60),
                    adjErr: "",
                  })
                }
                aria-label="Describe the reason"
                placeholder="Describe the reason"
              />
            )}
            {!!state.adjErr && (
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
                {state.adjErr}
              </div>
            )}
            <div className={flow.adjustFoot}>
              <div className={flow.adjustPreview}>{adjustPreview}</div>
              {!!line.adj && (
                <button
                  className={flow.adjustReset}
                  onClick={() => {
                    setState({
                      lines: state.lines.map((item) =>
                        item.id === line.id
                          ? { ...item, adj: 0, reason: "" }
                          : item,
                      ),
                      adjId: null,
                    });
                    showToast("Adjustment removed");
                  }}
                >
                  Remove adjustment
                </button>
              )}
              <button
                className={flow.adjustCancel}
                onClick={() => setState({ adjId: null })}
              >
                Cancel
              </button>
              <button className={flow.adjustApply} onClick={applyAdjustment}>
                Apply
              </button>
            </div>
          </div>
        )}
        <button className={flow.addItem} onClick={() => go("add", 1)}>
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
          <AmountRow key={row.key} row={row} subClassName={flow.rowSub} />
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
  checkout: { state, setState, go, showToast },
  menu,
}: {
  checkout: CheckoutController;
  menu: CheckoutSheetProps["menu"];
}) => (
  <div
    className={joinClassNames(
      flow.viewGap24,
      shared.motion,
      getViewAnimation(state.dir),
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
                const id = state.nid;
                setState({
                  lines: state.lines.concat([
                    {
                      id,
                      name,
                      sub: title === "Add-ons" ? "Add-on" : "Service",
                      base: price,
                      adj: 0,
                      reason: "",
                      added: true,
                    },
                  ]),
                  nid: id + 1,
                });
                go("items", -1);
                showToast(name + " added");
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
