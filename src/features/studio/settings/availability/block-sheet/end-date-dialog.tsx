import { X } from "lucide-react";
import { joinClassNames } from "../../../../../utils/class-names";
import { getMiniCalendarDays } from "../../../core/format";
import {
  getDialogPlacement,
  getOverlayAnimation,
} from "../../../../../components/overlay";
import type { StudioController } from "../../../core/use-studio";
import overlay from "../../../../../styles/components/overlay/index.module.css";
import styles from "../../../../../styles/features/studio/settings/availability/block-sheet/end-date-dialog.module.css";
import { getMonthNav, MonthCalendar } from "../../../shell/month-calendar";

/** "Repeat until" — the block sheet's end-date calendar. */
export const EndDateDialog = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, context } = studio;

  if (!state.endCalendarOpen) return null;

  const closeLater = () => {
    window.clearTimeout(context.timers.endCalendar);

    context.timers.endCalendar = window.setTimeout(
      () => setState({ endCalendarOpen: false, endCalendarOut: false }),
      210,
    );
  };

  const close = () => {
    setState({ endCalendarOut: true });
    closeLater();
  };

  const monthNav = getMonthNav(studio, "endCalendarMonth", "endCalendarYear");

  const days = getMiniCalendarDays(
    monthNav.month,
    monthNav.year,
    state.blockDraft.endDayOffset,
    (offset) => {
      setState(({ blockDraft }) => ({
        blockDraft: { ...blockDraft, endDayOffset: offset },
        endCalendarOut: true,
      }));

      closeLater();
    },
    Math.max(1, (state.blockDraft.day || 0) + 1),
  );

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.endScrim,
          state.endCalendarOut ? overlay.scrimOut21 : overlay.scrimIn20,
        )}
        onClick={close}
      ></div>
      <div
        className={joinClassNames(
          styles.endDialog,
          getDialogPlacement(isWide),
          getOverlayAnimation(state.endCalendarOut, "dialog", isWide),
        )}
      >
        <div className={styles.endHead}>
          <div className={styles.h3}>Repeat until</div>
          <button className={styles.close} onClick={close} aria-label="Close">
            <X size={19} strokeWidth={2} />
          </button>
        </div>
        <MonthCalendar monthNav={monthNav} days={days} />
      </div>
    </>
  );
};
