import type { ChangeEvent } from "react";
import { formatMinutes } from "../../core/format";
import type { WizardContext } from "./context";

const EXTRA_MINUTES = [0, 5, 10, 15, 20, 25, 30];

const getHourLabel = (hours: string | number) =>
  hours + (Number(hours) === 1 ? " hr" : " hrs");

const getMinuteLabel = (minutes: string | number) =>
  minutes + (Number(minutes) === 1 ? " min" : " mins");

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

  const hourOptions = Array.from({ length: 13 }, (_slot, hour) => ({
    value: String(hour),
    label: getHourLabel(hour),
  }));

  const minuteOptions = Array.from({ length: 12 }, (_slot, index) => ({
    value: String(index * 5),
    label: getMinuteLabel(index * 5),
  }));

  if (
    durationHourValue !== "" &&
    !hourOptions.some(({ value }) => value === durationHourValue)
  )
    hourOptions.unshift({
      value: durationHourValue,
      label: getHourLabel(durationHourValue),
    });

  if (
    durationMinuteValue !== "" &&
    !minuteOptions.some(({ value }) => value === durationMinuteValue)
  )
    minuteOptions.push({
      value: durationMinuteValue,
      label: getMinuteLabel(durationMinuteValue),
    });

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
    priceWidth: `${getText(draft.price).length * 8 + 14}px`,
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
    extraOptionsShort: getExtraOptions(
      defaultExtra ? `+${defaultExtra}m` : "+ min",
      (minutes) => `+${minutes}m`,
    ),
    isExtraOverride: !!defaultExtra && isExtraTyped,
    extraHelp: `Overrides your default (${formatMinutes(defaultExtra)}).`,
  };
};
