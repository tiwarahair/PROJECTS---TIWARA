import { Plus, Undo2 } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { AmountRow, getViewAnimation } from "./detail";
import { AdjustPanel } from "./adjust";
import { getAdjustNote } from "./view";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController, CheckoutSheetProps } from "./use-checkout";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/index.module.css";
import { formatMoney } from "../../utils/money";

export const CheckoutItems = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, booking, goTo } = checkout;
  const line = state.lines.find(({ id }) => id === state.adjustingLineId);

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
                    <div className={flow.itemWas}>{formatMoney(item.base)}</div>
                  )}
                  <div className={flow.itemPrice}>
                    {formatMoney(item.base + item.adjustment)}
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
                  onClick={() => setState({ adjustingLineId: item.id })}
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
        {line && <AdjustPanel key={line.id} line={line} checkout={checkout} />}
        <button className={flow.addItem} onClick={() => goTo("add", 1)}>
          <Plus size={16} strokeWidth={1.7} />
          Add item
        </button>
      </div>
      <div>
        <div className={flow.rowTotal}>
          <span>Total</span>
          <span className={shared.numeric}>
            {formatMoney(checkout.money.items)}
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
            <Undo2 className={flow.iconTop3} size={16} strokeWidth={1.7} />
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
    {menu.map(({ title, rows }) => (
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
              <span className={flow.addPrice}>{formatMoney(price)}</span>
              <Plus size={18} color="var(--accent-700)" strokeWidth={1.7} />
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);
