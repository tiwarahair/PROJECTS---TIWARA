// Studio → Settings → Availability: pause, working hours, blocked time and closed periods.
import type { ChangeEvent } from "react";
import {
  removeClosedPeriod,
  saveHours,
} from "../../../../lib/studio-api/settings";
import { SHORT_MONTHS_SEPT } from "../../../../utils/dates";
import { getSettingsSave } from "../save";
import { getBlockColour } from "../../core/model";
import { fromHours } from "../records";
import type { StudioController } from "../../core/use-studio";

export const getAvailabilityView = (studio: StudioController) => {
  const { state, setState, actions } = studio;
  const { showToast, openSheet, leavePage, checkDone } = actions;
  const { sync, saveStylist, markSaved } = getSettingsSave(studio);

  const setHours = (hours: typeof state.hours) => setState({ hours });

  const pause = state.pause || { on: false, until: "" };

  const setPause = (patch: Partial<typeof pause>) =>
    setState({ pause: { ...pause, ...patch } });

  const untilDate = pause.until ? new Date(`${pause.until}T00:00`) : null;

  const untilLabel =
    untilDate && !isNaN(untilDate.getTime())
      ? `${untilDate.getDate()} ${SHORT_MONTHS_SEPT[untilDate.getMonth()]}`
      : "";

  const untilNote = untilLabel ? ` until ${untilLabel}` : "";

  return {
    pause,
    togglePause: () => setPause({ on: !pause.on }),
    onPauseUntil: (event: ChangeEvent<HTMLInputElement>) =>
      setPause({ until: event.target.value }),
    clearPauseUntil: () => setPause({ until: "" }),
    pauseBanner: `Online bookings are paused${untilNote}. Clients see ‘Not taking online bookings right now’.`,
    // availability
    hourRows: state.hours.map((hours, index) => {
      const patchDay = (patch: Partial<typeof hours>) =>
        setHours(
          state.hours.map((item, itemIndex) =>
            itemIndex === index ? { ...item, ...patch } : item,
          ),
        );

      return {
        key: hours.day,
        ...hours,
        toggle: () => patchDay({ on: !hours.on }),
        setStart: (event: ChangeEvent<HTMLSelectElement>) =>
          patchDay({ start: event.target.value }),
        setEnd: (event: ChangeEvent<HTMLSelectElement>) =>
          patchDay({ end: event.target.value }),
      };
    }),
    blockedList: state.blocked.map((block) => ({
      key: block.id,
      day: block.day,
      span: block.span,
      reason: block.reason || "No reason given",
      hex: getBlockColour().hex,
      edit: () => actions.editBlock(block),
      remove: () => actions.removeBlock(block),
    })),
    closedList: state.closed.map((period) => ({
      key: period.id,
      span: period.span,
      reason: period.reason || "Closed for booking",
      edit: () =>
        openSheet("closed", {
          closedDraft: {
            from: period.from || "",
            to: period.to || "",
            reason: period.reason || "",
            editId: period.id,
          },
        }),
      remove: () =>
        setState({
          confirm: {
            body: `${period.span} will open up for online booking again.`,
            yes: () => {
              const before = state.closed;

              setState(({ closed }) => ({
                closed: closed.filter(({ id }) => id !== period.id),
                confirm: null,
              }));

              sync?.save(() => removeClosedPeriod(period.id), {
                closed: before,
              });

              showToast("Closed period removed");
            },
          },
        }),
    })),
    openBlock: () =>
      openSheet("block", {
        blockDraft: { day: 0, start: "13:00", end: "14:00", reason: "" },
      }),
    openClosed: () =>
      openSheet("closed", { closedDraft: { from: "", to: "", reason: "" } }),
    saveAvailability: () => {
      const { saved, restoreSaved } = markSaved({
        hours: state.hours,
        pause: state.pause,
      });

      setState({ check: { ...state.check, availability: true } });

      sync?.save(
        (stylistId) => saveHours(fromHours(state.hours, stylistId)),
        { hours: saved?.hours ?? state.hours },
        restoreSaved,
      );

      saveStylist(
        {
          pause_on: pause.on,
          pause_until: pause.until || null,
          availability_confirmed_at: new Date().toISOString(),
        },
        { check: state.check, pause: saved?.pause },
        restoreSaved,
      );

      showToast("Availability saved");
      leavePage();
      checkDone();
    },
  };
};
