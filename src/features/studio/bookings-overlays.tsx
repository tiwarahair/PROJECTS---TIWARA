import type { CSSProperties } from "react";
import { Clock, Lock, Pencil, Plus, Trash, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import type { BookingsView } from "./bookings-view";
import { dayInfo, hhmm, timeToMinutes } from "./studio-format";
import { getDialogPlacement, getOverlayAnimation } from "./studio-overlay";
import type { StudioController } from "./use-studio";
import overlay from "../../styles/features/studio/studio-overlay.module.css";
import styles from "../../styles/features/studio/bookings-overlays.module.css";

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
          state.filterOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={view.closeFilter}
      ></div>
      <div
        className={joinClassNames(
          styles.filterSheet,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.filterOut, "dialog", isWide),
        )}
      >
        <div className={styles.sheetHead}>
          <div className={styles.h3}>Filter bookings</div>
          <button
            className={styles.close}
            onClick={view.closeFilter}
            aria-label="Close"
          >
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.sections}>
          {view.filterSections.map(({ label, options }) => (
            <div key={label}>
              <div className={styles.sectionLabel}>{label}</div>
              <div className={styles.options}>
                {options.map(
                  ({ key, label: optionLabel, count, isOn, pick }) => (
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
                  ),
                )}
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

/** The wide calendar's popover for a tapped slot or a blocked-time tile. */
export const SlotPopover = ({ studio }: { studio: StudioController }) => {
  const { state, setState, actions } = studio;
  const { pop } = state;

  if (!pop) return null;

  const isBlock = pop.kind === "block";

  // runtime: placed at the tapped point
  const position = {
    "--pop-x": `${pop.x}px`,
    "--pop-y": `${pop.y}px`,
  } as CSSProperties;

  const book = () => {
    const time = pop.time;

    setState({ pop: null });

    actions.openSheet("add", {
      addStep: 1,
      addDay: state.dayIndex,
      addTime: time ?? null,
      addCustom: !!time && timeToMinutes(time) % 30 !== 0,
    });
  };

  const block = () => {
    const time = pop.time || "13:00";

    setState({ pop: null });

    actions.openSheet("block", {
      blockDraft: {
        day: state.dayIndex,
        start: time,
        end: hhmm(Math.min(24 * 60 - 15, timeToMinutes(time) + 60)),
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
              <div className={styles.popSub}>{pop.subtitle || ""}</div>
            </div>
            <button
              className={styles.popItem}
              onClick={() => {
                setState({ pop: null });

                if (pop.block) actions.editBlock(pop.block);
              }}
            >
              <Pencil size={16} strokeWidth={1.7} />
              Edit
            </button>
            <button
              className={joinClassNames(styles.popItem, styles.popDanger)}
              onClick={() => {
                setState({ pop: null });

                if (pop.block) actions.removeBlock(pop.block);
              }}
            >
              <Trash size={16} strokeWidth={1.7} />
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
              <Plus size={16} strokeWidth={1.7} />
              New booking
            </button>
            <button className={styles.popItem} onClick={block}>
              <Lock size={16} strokeWidth={1.7} />
              Block time
            </button>
          </>
        )}
      </div>
    </>
  );
};

/** The narrow calendar's sheet for a tapped slot. */
export const QuickActions = ({
  studio,
  view,
}: {
  studio: StudioController;
  view: BookingsView;
}) => {
  const { state, setState, isWide, actions, context } = studio;

  if (!state.quickAdd) return null;

  const time = state.quickAdd.time;

  const close = () => {
    setState({ quickAddOut: true });
    window.clearTimeout(context.timers.quick);

    context.timers.quick = window.setTimeout(
      () => setState({ quickAdd: null, quickAddOut: false }),
      210,
    );
  };

  const add = () => {
    const dayIndex = state.dayIndex;

    setState({ quickAdd: null, quickAddOut: false });

    actions.openSheet("add", {
      addStep: 1,
      addDay: dayIndex,
      addTime: time || null,
      addCustom: !!time && timeToMinutes(time) % 30 !== 0,
    });
  };

  const block = () => {
    const start = time ? timeToMinutes(time) : 13 * 60;

    setState({ quickAdd: null, quickAddOut: false });

    actions.openSheet("block", {
      blockDraft: {
        day: state.dayIndex,
        start: hhmm(start),
        end: hhmm(Math.min(23 * 60 + 45, start + 60)),
        reason: "",
        frequency: "none",
      },
    });
  };

  const getBlockSubtitle = () => {
    if (!time) return "Keep part of this day free";

    const blockEnd = hhmm(Math.min(24 * 60 - 15, timeToMinutes(time) + 60));

    return `Keep ${time} to ${blockEnd} free`;
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.quickScrim,
          state.quickAddOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={close}
      ></div>
      <div
        className={joinClassNames(
          styles.quickSheet,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.quickAddOut, "dialog", isWide),
        )}
      >
        <div className={styles.quickHead}>
          <div className={styles.grow}>
            <div className={styles.h3}>
              {dayInfo(state.dayIndex).label + (time ? ` · ${time}` : "")}
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
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <div>
          <button className={styles.quickItem} onClick={add}>
            <Plus
              className={styles.noShrink}
              size={17}
              strokeWidth={1.7}
              color="var(--text-primary)"
            />
            <span className={styles.flex1}>
              <span className={styles.quickLabel}>Add appointment</span>
              <span className={styles.quickSub}>
                {time
                  ? `Book a client in at ${time}`
                  : "Book a client in on this day"}
              </span>
            </span>
          </button>
          <button className={styles.quickItem} onClick={block}>
            <Clock
              className={styles.noShrink}
              size={17}
              strokeWidth={1.7}
              color="var(--text-primary)"
            />
            <span className={styles.flex1}>
              <span className={styles.quickLabel}>Block time</span>
              <span className={styles.quickSub}>{getBlockSubtitle()}</span>
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
