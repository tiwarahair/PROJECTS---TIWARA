const getHourLabel = (hours: string | number) =>
  hours + (Number(hours) === 1 ? " hr" : " hrs");

const getMinuteLabel = (minutes: string | number) =>
  minutes + (Number(minutes) === 1 ? " min" : " mins");

// "1h" / "30m"
const getShortHourLabel = (hours: string | number) => `${hours}h`;
const getShortMinuteLabel = (minutes: string | number) => `${minutes}m`;

const withCurrent = (
  options: { value: string; label: string }[],
  current: string,
  getLabel: (value: string) => string,
) =>
  current === "" || options.some(({ value }) => value === current)
    ? options
    : [...options, { value: current, label: getLabel(current) }].sort(
        (first, second) => Number(first.value) - Number(second.value),
      );

/** 0–12 hours, the same steps everywhere a service's time is set */
export const getHourOptions = (current = "", isShort = false) => {
  const getLabel = isShort ? getShortHourLabel : getHourLabel;

  return withCurrent(
    Array.from({ length: 13 }, (_slot, hour) => ({
      value: String(hour),
      label: getLabel(hour),
    })),
    current,
    getLabel,
  );
};

/** 0–55 minutes in 5min gaps */
export const getMinuteOptions = (current = "", isShort = false) => {
  const getLabel = isShort ? getShortMinuteLabel : getMinuteLabel;

  return withCurrent(
    Array.from({ length: 12 }, (_slot, index) => ({
      value: String(index * 5),
      label: getLabel(index * 5),
    })),
    current,
    getLabel,
  );
};
