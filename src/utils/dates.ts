/** Days ahead the default "latest" date is set to when a booking opens. */
export const DEFAULT_DATE_WINDOW_DAYS = 30;

/** `yyyy-mm-dd`, built from local parts so it does not shift across timezones. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export interface DateWindow {
  from: string;
  to: string;
}

/** Today through today + 30 days, the window a new booking starts with. */
export function defaultDateWindow(today = new Date()): DateWindow {
  return {
    from: toDateInputValue(today),
    to: toDateInputValue(addDays(today, DEFAULT_DATE_WINDOW_DAYS)),
  };
}
