import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import type { BookingsView } from "./bookings-view";
import { dayInfo, hhmm, toMin } from "./studio-format";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import overlay from "./studio-overlay.module.css";
import styles from "./bookings-overlays.module.css";

const CloseIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18M6 6l12 12"></path>
  </svg>
);

export const FilterSheet = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
  const { state, isWide } = studio;
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.filterScrim,
          state.filtOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={view.closeFilter}
      ></div>
      <div
        className={joinClassNames(
          styles.filterSheet,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.filtOut, "dlg", isWide),
        )}
      >
        <div className={styles.sheetHead}>
          <div className={styles.h3}>Filter bookings</div>
          <button
            className={styles.close}
            onClick={view.closeFilter}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <div className={styles.sections}>
          {view.filterSections.map(({ label, opts }) => (
            <div key={label}>
              <div className={styles.sectionLabel}>{label}</div>
              <div className={styles.options}>
                {opts.map(({ key, label: optionLabel, count, isOn, pick }) => (
                  <button
                    key={key}
                    className={joinClassNames(
                      styles.option,
                      isOn && styles.optionOn,
                    )}
                    onClick={pick}
                  >
                    {optionLabel}
                    <span className={styles.count}>{count}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.clear} onClick={view.clearFilter}>
            Clear all
          </button>
          <button className={styles.show} onClick={view.closeFilter}>
            {view.filterCta}
          </button>
        </div>
      </div>
    </>
  );
};

/** The wide calendar's popover for a tapped slot or a blocked-time tile (prototype pop*). */
export const SlotPopover = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;
  const { pop } = state;
  if (!pop) return null;
  const isBlock = pop.kind === "block";
  // runtime: placed at the tapped point
  const position = {
    "--pop-x": pop.x + "px",
    "--pop-y": pop.y + "px",
  } as CSSProperties;
  const book = () => {
    const time = pop.time;
    setState({ pop: null });
    actions.openSheet("add", {
      addStep: 1,
      addDay: state.dayIdx,
      addTime: time ?? null,
      addCustom: !!time && toMin(time) % 30 !== 0,
    });
  };
  const block = () => {
    const time = pop.time || "13:00";
    setState({ pop: null });
    actions.openSheet("block", {
      blockDraft: {
        day: state.dayIdx,
        start: time,
        end: hhmm(Math.min(24 * 60 - 15, toMin(time) + 60)),
        reason: "",
      },
    });
  };
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={styles.popScrim}
        onClick={() => setState({ pop: null })}
      ></div>
      <div className={styles.pop} style={position}>
        {isBlock && (
          <>
            <div className={styles.popHead}>
              <div className={styles.popTitle}>{pop.title || ""}</div>
              <div className={styles.popSub}>{pop.sub || ""}</div>
            </div>
            <button
              className={styles.popItem}
              onClick={() => {
                setState({ pop: null });
                if (pop.b) actions.editBlock(pop.b);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"></path>
              </svg>
              Edit
            </button>
            <button
              className={joinClassNames(styles.popItem, styles.popDanger)}
              onClick={() => {
                setState({ pop: null });
                if (pop.b) actions.removeBlock(pop.b);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"></path>
              </svg>
              Remove
            </button>
          </>
        )}
        {!isBlock && (
          <>
            <div className={styles.at}>
              At <strong className={styles.atTime}>{pop.time || ""}</strong>
              {pop.warn && (
                <span className={styles.outside}> · outside working hours</span>
              )}
            </div>
            <button className={styles.popItem} onClick={book}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              New booking
            </button>
            <button className={styles.popItem} onClick={block}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11h18v11H3zM7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Block time
            </button>
          </>
        )}
      </div>
    </>
  );
};

/** The narrow calendar's sheet for a tapped slot (prototype qa*). */
export const QuickActions = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
  const { state, setState, isWide, actions, context } = studio;
  if (!state.qa) return null;
  const time = state.qa.time;
  const close = () => {
    setState({ qaOut: true });
    window.clearTimeout(context.timers.quick);
    context.timers.quick = window.setTimeout(
      () => setState({ qa: null, qaOut: false }),
      210,
    );
  };
  const add = () => {
    const dayIdx = state.dayIdx;
    setState({ qa: null, qaOut: false });
    actions.openSheet("add", {
      addStep: 1,
      addDay: dayIdx,
      addTime: time || null,
      addCustom: !!time && toMin(time) % 30 !== 0,
    });
  };
  const block = () => {
    const start = time ? toMin(time) : 13 * 60;
    setState({ qa: null, qaOut: false });
    actions.openSheet("block", {
      blockDraft: {
        day: state.dayIdx,
        start: hhmm(start),
        end: hhmm(Math.min(23 * 60 + 45, start + 60)),
        reason: "",
        freq: "none",
      },
    });
  };
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.quickScrim,
          state.qaOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={close}
      ></div>
      <div
        className={joinClassNames(
          styles.quickSheet,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.qaOut, "dlg", isWide),
        )}
      >
        <div className={styles.quickHead}>
          <div className={styles.grow}>
            <div className={styles.h3}>
              {dayInfo(state.dayIdx).label + (time ? " · " + time : "")}
            </div>
            <div
              className={joinClassNames(
                styles.quickHint,
                view.isQuickOutside && styles.quickHintWarn,
              )}
            >
              {view.quickHint}
            </div>
          </div>
          <button className={styles.close} onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div>
          <button className={styles.quickItem} onClick={add}>
            <svg
              className={styles.noShrink}
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            <span className={styles.flex1}>
              <span className={styles.quickLabel}>Add appointment</span>
              <span className={styles.quickSub}>
                {time
                  ? "Book a client in at " + time
                  : "Book a client in on this day"}
              </span>
            </span>
          </button>
          <button className={styles.quickItem} onClick={block}>
            <svg
              className={styles.noShrink}
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 7v5l3 3"></path>
            </svg>
            <span className={styles.flex1}>
              <span className={styles.quickLabel}>Block time</span>
              <span className={styles.quickSub}>
                {time
                  ? "Keep " +
                    time +
                    " to " +
                    hhmm(Math.min(24 * 60 - 15, toMin(time) + 60)) +
                    " free"
                  : "Keep part of this day free"}
              </span>
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
