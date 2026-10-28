import type { DecoratedBooking } from "./decorate";
import type { StudioState } from "../core/types";
import { PAY_OPTIONS, RANGE_OPTIONS, STATUS_OPTIONS } from "./types";
import type { FilterOption } from "./types";

interface UpcomingFilter {
  label: string;
  idle: string;
  options: FilterOption[];
  read: (state: StudioState) => string;
  patch: (id: string) => Partial<StudioState>;
  matches: (id: string, booking: DecoratedBooking) => boolean;
}

/** Whether a booking `dayOffset` days away falls in a "When" filter option. */
const isInRangeOption = (id: string, dayOffset: number) => {
  if (id === "today") return dayOffset === 0;

  if (id === "7") return dayOffset < 7;

  if (id === "30") return dayOffset < 30;

  return true;
};

const isPayOption = (id: string, paid: string) => {
  if (id === "any") return true;

  if (id === "unpaid") return paid === "none" || paid === "link";

  return paid === "full";
};

export const UPCOMING_FILTERS: UpcomingFilter[] = [
  {
    label: "When",
    idle: "all",
    options: RANGE_OPTIONS,
    read: ({ filterRange }) => filterRange,
    patch: (id) => ({ filterRange: id }),
    matches: (id, { dayOffset }) => isInRangeOption(id, dayOffset),
  },
  {
    label: "Status",
    idle: "all",
    options: STATUS_OPTIONS,
    read: ({ filterStatus }) => filterStatus,
    patch: (id) => ({ filterStatus: id }),
    matches: (id, { status }) => id === "all" || status === id,
  },
  {
    label: "Payment",
    idle: "any",
    options: PAY_OPTIONS,
    read: ({ filterPayment }) => filterPayment,
    patch: (id) => ({ filterPayment: id }),
    matches: (id, { paid }) => isPayOption(id, paid),
  },
];

export const isUpcomingMatch = (
  state: StudioState,
  booking: DecoratedBooking,
  swap?: { filter: UpcomingFilter; id: string },
) =>
  UPCOMING_FILTERS.every((filter) =>
    filter.matches(
      filter === swap?.filter ? swap.id : filter.read(state),
      booking,
    ),
  );

export const getOptionLabel = (options: FilterOption[], id: string) =>
  options.find((option) => option.id === id)?.label || "";
