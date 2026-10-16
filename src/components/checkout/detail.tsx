import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getDetailView } from "./detail-view";
import { TONES } from "./detail-view/types";
import type { CheckoutViewModel, DetailRow } from "./view";
import type { CheckoutController } from "./use-checkout";
import flow from "../../styles/components/checkout/flow.module.css";
import shared from "../../styles/components/checkout/checkout-sheet.module.css";

/** Label (+ sub line) and amount. */
export const AmountRow = ({
  row: { label, subtitle, value, isAlert },
  subtitleClassName,
}: {
  row: DetailRow;
  subtitleClassName: string | undefined;
}) => (
  <div className={flow.row}>
    <span className={shared.minWidth}>
      <span className={flow.rowLabel}>{label}</span>
      {!!subtitle && <span className={subtitleClassName}>{subtitle}</span>}
    </span>
    <span
      className={joinClassNames(
        flow.rowValue,
        isAlert ? flow.valueAlert : flow.valueNormal,
      )}
    >
      {value}
    </span>
  </div>
);

export const getViewAnimation = (direction: number) => {
  if (direction === 0) return undefined;

  return direction > 0 ? shared.animForward : shared.animBack;
};

const ACTION_CLASSES = {
  primary: flow.actionPrimary,
  secondary: flow.actionSecondary,
  ghost: flow.actionGhost,
};

export const CheckoutDetail = ({
  checkout,
  view,
}: {
  checkout: CheckoutController;
  view: CheckoutViewModel;
}) => {
  const { state, setState, booking } = checkout;

  const { badges, panel, rows, total, links, actions, hasUndo } = getDetailView(
    checkout,
    view,
  );

  return (
    <div
      className={joinClassNames(
        flow.viewGap26,
        shared.motion,
        getViewAnimation(state.direction),
      )}
      data-ck-m="1"
    >
      <div>
        <div className={flow.badges}>
          {badges.map(({ label, icon: BadgeIcon, tone }) => {
            // the badge colours come from the tone table
            const toneStyle = {
              "--badge-bg": TONES[tone].background,
              "--badge-fg": TONES[tone].foreground,
            } as CSSProperties;

            return (
              <span
                key={label}
                className={joinClassNames(flow.badge)}
                style={toneStyle}
              >
                <BadgeIcon size={14} strokeWidth={2} />
                {label}
              </span>
            );
          })}
        </div>
        <div className={flow.clientRow}>
          <span className={flow.avatarLarge} aria-hidden="true">
            {booking.client
              .split(" ")
              .map((word) => word[0])
              .join("")}
          </span>
          <h2 className={flow.clientName}>{booking.client}</h2>
        </div>
        <div className={flow.detailService}>
          {`${booking.service} · ${booking.meta}`}
        </div>
        <div className={flow.detailWhen}>
          {`${booking.day}, ${booking.time}`}
        </div>
      </div>
      {panel && (
        <div
          className={joinClassNames(
            flow.panel,
            panel.tone === "red" ? flow.panelRed : flow.panelNeutral,
          )}
        >
          <panel.icon
            className={shared.iconTop2}
            size={18}
            color={
              panel.tone === "red" ? "var(--accent-700)" : "var(--neutral-700)"
            }
            strokeWidth={1.7}
          />
          <div className={shared.minWidth}>
            <div
              className={joinClassNames(
                flow.strong15,
                panel.tone === "red"
                  ? flow.panelTitleRed
                  : flow.panelTitleNeutral,
              )}
            >
              {panel.title}
            </div>
            <div className={flow.panelBody}>{panel.body}</div>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div>
          <div className={flow.sectionLabel}>Payment</div>
          {rows.map((row) => (
            <AmountRow
              key={row.key}
              row={row}
              subtitleClassName={flow.rowSubDetail}
            />
          ))}
          <div className={flow.totalDetail}>
            <span>{total.label}</span>
            <span className={shared.numeric}>{total.value}</span>
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className={flow.stack8}>
          {links.map(({ key, label, icon: LinkIcon, run }) => (
            <button key={key} className={flow.linkRow} onClick={run}>
              <LinkIcon
                size={18}
                color="var(--neutral-600)"
                strokeWidth={1.7}
              />
              <span className={flow.linkLabel}>{label}</span>
              <ChevronRight
                size={16}
                color="var(--neutral-500)"
                strokeWidth={1.7}
              />
            </button>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className={shared.stack10}>
          {actions.map(({ label, run, kind }) => (
            <button
              key={label}
              className={joinClassNames(flow.action, ACTION_CLASSES[kind])}
              onClick={run}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {hasUndo && (
        <div className={flow.undoBlock}>
          <button
            className={flow.undoButton}
            onClick={() => setState({ dialog: "undoNs" })}
          >
            Undo no-show
          </button>
          <div className={shared.note13}>
            {`Only if ${view.name} did attend. It reverses the no-show entirely.`}
          </div>
        </div>
      )}
    </div>
  );
};
