import type { ChangeEvent } from "react";
import { durationToMinutes } from "../../core/format";
import type { StudioService, StudioState } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import type { AddContext } from "./context";
import { EXTRA_OPTIONS, HOUR_OPTIONS, MINUTE_OPTIONS } from "./types";

const clampSelect = (event: ChangeEvent<HTMLSelectElement>, max: number) =>
  Math.max(0, Math.min(max, parseInt(event.target.value) || 0));

const hasAdjustments = (
  { addDuration, addPrice }: StudioState,
  service: StudioService | null,
) =>
  !!service &&
  ((addDuration != null &&
    addDuration !== durationToMinutes(service.duration)) ||
    (addPrice != null && addPrice !== String(service.price)));

export const getServiceEditView = ({
  state,
  setState,
  service,
  duration,
  priceLabel,
  selected,
}: AddContext) => {
  const addonCount = selected.length;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const setDuration = (total: number) =>
    setState({ addDuration: Math.max(5, total), addOverlapAllowed: false });

  return {
    isServiceEdit:
      state.addStep === 2 &&
      !!state.addEditService &&
      !!service &&
      !state.addAddonPickerOpen,
    isServicePicked: !!service,
    selectedName: service ? service.name : "",
    selectedMeta: service
      ? [
          formatDuration(duration),
          `£${priceLabel}`,
          addonCount
            ? addonCount + (addonCount === 1 ? " add-on" : " add-ons")
            : "",
          state.addExtra ? `+${state.addExtra}m after` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    openEdit: () => setState({ addEditService: true }),
    closeEdit: () => setState({ addEditService: false }),
    extraValue: String(state.addExtra || 0),
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      setState({ addExtra: Number(event.target.value) }),
    extraOptions: EXTRA_OPTIONS,
    durationHours: String(hours),
    durationMinutes: String(minutes),
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    onDurationHours: (event: ChangeEvent<HTMLSelectElement>) =>
      setDuration(clampSelect(event, 12) * 60 + minutes),
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      setDuration(hours * 60 + clampSelect(event, 55)),
    priceValue: String(state.addPrice ?? service?.price ?? ""),
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addPrice: event.target.value }),
    isAdjusted: hasAdjustments(state, service),
    resetAdjustments: () =>
      setState({
        addDuration: null,
        addPrice: null,
        addAddons: [],
        addExtra: 0,
      }),
  };
};
