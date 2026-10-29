import type { ChangeEvent } from "react";
import { formatMinutes } from "../../core/format";
import type { WizardContext } from "./context";
import { getHourOptions, getMinuteOptions } from "./time-options";

const EXTRA_MINUTES = [0, 5, 10, 15, 20, 25, 30];

const getText = (value: string | number | null | undefined) =>
  String(value == null ? "" : value);

const getExtraOptions = (
  emptyLabel: string,
  getLabel: (minutes: number) => string,
) =>
  [{ value: "", label: emptyLabel }].concat(
    EXTRA_MINUTES.map((minutes) => ({
      value: String(minutes),
      label: getLabel(minutes),
    })),
  );

export const getPriceView = ({ state, draft, setDraft }: WizardContext) => {
  const durationHourValue = getText(draft.durationHours);
  const durationMinuteValue = getText(draft.durationMinutes);

  const hourOptions = getHourOptions(durationHourValue);
  const minuteOptions = getMinuteOptions(durationMinuteValue);

  const defaultExtra = state.rules.extra || 0;
  const rawExtra = getText(draft.extra);
  const isExtraTyped = rawExtra !== "";

  return {
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ price: event.target.value }),
    onDurationHours: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ durationHours: event.target.value }),
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ durationMinutes: event.target.value }),
    durationHourValue: durationHourValue === "" ? "0" : durationHourValue,
    durationMinuteValue: durationMinuteValue === "" ? "0" : durationMinuteValue,
    hourOptions,
    minuteOptions,
    extraValue: rawExtra,
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ extra: event.target.value }),
    isExtraTyped,
    extraOptions: getExtraOptions(
      defaultExtra ? `Default (${defaultExtra} min)` : "None selected",
      (minutes) => `${minutes} min`,
    ),
    isExtraOverride: !!defaultExtra && isExtraTyped,
    extraHelp: `Overrides your default (${formatMinutes(defaultExtra)}).`,
  };
};
