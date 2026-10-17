import { getDecoratedBookings } from "./decorate";
import { getClient, getPastRows, isPastIn } from "../core/model";
import type { StudioController } from "../core/use-studio";
import { isUpcomingMatch } from "./filters";

export const getContext = (studio: StudioController) => {
  const { state, actions, seedPast } = studio;
  const now = new Date();
  const isList = state.bookingsLayout === "list";
  const isPast = isList && (state.listScope || "upcoming") === "past";
  const query = (state.bookingsQuery || "").trim().toLowerCase();
  const pastFilter = state.pastFilter || "all";

  const matchesQuery = (name: string, service: string) =>
    !query ||
    name.toLowerCase().includes(query) ||
    service.toLowerCase().includes(query);

  const upcoming = getDecoratedBookings(state, (booking) =>
    actions.openSheet("booking", { sheetBookingId: booking.id }),
  );

  const upcomingBase = upcoming.filter((booking) =>
    matchesQuery(booking.clientName, booking.service),
  );

  const pastBase = getPastRows(state, seedPast).filter((row) =>
    matchesQuery(getClient(state, row.client).name, row.service),
  );

  return {
    studio,
    state,
    setState: studio.setState,
    actions,
    now,
    nowMinutes: now.getHours() * 60 + now.getMinutes(),
    upcoming,
    isList,
    isPast,
    isUpcoming: isList && !isPast,
    query,
    pastFilter,
    upcomingBase,
    upcomingItems: upcomingBase.filter((booking) =>
      isUpcomingMatch(state, booking),
    ),
    pastBase,
    pastItems: pastBase.filter((row) => isPastIn(row, pastFilter)),
  };
};

export type BookingsContext = ReturnType<typeof getContext>;
