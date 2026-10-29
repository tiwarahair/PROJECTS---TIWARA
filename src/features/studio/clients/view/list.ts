import { getInitials } from "../../../../utils/initials";
import { dateLabel, timeToMinutes } from "../../core/format";
import type { StudioBooking, StudioClient } from "../../core/types";
import type { ClientActions } from "./actions";
import type { ClientsContext } from "./context";
import type { ClientStats } from "./stats";

interface ListRow {
  client: StudioClient;
  stats: ClientStats;
}

const FILTERS = [
  ["all", "All"],
  ["up", "Upcoming"],
  ["blocked", "Blocked"],
] as const;

const isAny = () => true;

const FILTER_TESTS: Record<string, (row: ListRow) => boolean> = {
  // eslint-disable-next-line id-length -- keyed by the "up" filter id
  up: ({ stats }) => stats.upcoming.length > 0,
  blocked: ({ client }) => !!client.blocked,
};

const getFilterTest = (id: string) => FILTER_TESTS[id] ?? isAny;

const getLastVisitTime = ({ lastAt }: StudioClient) =>
  lastAt ? Date.parse(lastAt) || 0 : 0;

const nextKey = ({ stats }: ListRow) =>
  stats.upcoming.length
    ? (stats.upcoming[0]?.dayOffset || 0) * 1440 +
      timeToMinutes(stats.upcoming[0]?.time)
    : 1e9;

const CLIENT_SORTERS: Record<
  string,
  (first: ListRow, second: ListRow) => number
> = {
  next: (first, second) =>
    nextKey(first) - nextKey(second) ||
    getLastVisitTime(second.client) - getLastVisitTime(first.client),
  last: (first, second) =>
    getLastVisitTime(second.client) - getLastVisitTime(first.client),
  visits: (first, second) =>
    (second.client.visits || 0) - (first.client.visits || 0),
  // eslint-disable-next-line id-length -- keyed by the "az" sort option value
  az: (first, second) => first.client.name.localeCompare(second.client.name),
};

const getNextLabel = (upcoming: StudioBooking[]) =>
  upcoming.length
    ? `${dateLabel(upcoming[0]?.dayOffset || 0)}, ${upcoming[0]?.time}`
    : "None booked";

const getMeta = ({ client, stats }: ListRow) => {
  if (stats.upcoming.length) {
    const nextLabel = getNextLabel(stats.upcoming);
    const lastNote = client.last ? ` · Last ${client.last}` : "";

    return `Next ${nextLabel}${lastNote}`;
  }

  return client.last ? `Last visit ${client.last}` : "No visits yet";
};

const isMatch = (query: string, { client }: ListRow) => {
  const queryDigits = query.replace(/\s/g, "");

  return (
    !query ||
    client.name.toLowerCase().includes(query) ||
    (client.email || "").toLowerCase().includes(query) ||
    (!!queryDigits &&
      (client.phone || "").replace(/\s/g, "").includes(queryDigits))
  );
};

export const getListView = (
  { state, setState, isWide, actions, all, getStats }: ClientsContext,
  { openEdit }: ClientActions,
) => {
  const query = (state.clientListQuery || "").trim().toLowerCase();
  const rows = all.map((client) => ({ client, stats: getStats(client.id) }));

  const list = rows
    .filter(getFilterTest(state.clientFilter))
    .filter((row) => isMatch(query, row))
    .sort(CLIENT_SORTERS[state.clientSort] ?? CLIENT_SORTERS.next);

  const open = (client: StudioClient) => {
    if (isWide) {
      actions.openSheet("cliView", {
        selectedClientId: client.id,
        clientAppointmentsTab: "up",
        clientFromBookingId: null,
      });

      return;
    }

    setState({ selectedClientId: client.id, clientAppointmentsTab: "up" });
    actions.scrollBody(0, false);
  };

  const isFilteredOut =
    (!!query || state.clientFilter !== "all") && !!all.length;

  return {
    filters: FILTERS.map(([id, label]) => ({
      key: id,
      label,
      count: String(rows.filter(getFilterTest(id)).length),
      isOn: state.clientFilter === id,
      onSelect: () => setState({ clientFilter: id }),
    })),
    clientRows: list.map(({ client, stats }, index) => ({
      key: client.id ?? "",
      name: client.name,
      contact: client.phone || client.email || "No contact details",
      img: client.img || "",
      initials: getInitials(client.name),
      isBlocked: !!client.blocked,
      hasSensitivities: !!client.sensitivities,
      last: client.last || "No visits yet",
      next: getNextLabel(stats.upcoming),
      hasNext: stats.upcoming.length > 0,
      upcomingCount: String(stats.upcoming.length),
      noShows: stats.noShows,
      noShowLabel:
        stats.noShows + (stats.noShows === 1 ? " no-show" : " no-shows"),
      spend: `£${client.spent || 0}`,
      meta: getMeta({ client, stats }),
      delay: `${(Math.min(index, 10) * 0.04).toFixed(2)}s`,
      open: () => open(client),
    })),
    emptyTitle: isFilteredOut ? "No clients match" : "No clients yet",
    emptyBody: isFilteredOut
      ? "Try another name, number or email, or clear the filter."
      : "Clients appear here after their first booking. You can also add one yourself.",
    emptyAction: isFilteredOut ? "Clear search" : "Add client",
    emptyGo: isFilteredOut
      ? () => setState({ clientListQuery: "", clientFilter: "all" })
      : () => openEdit(null),
    addClient: () => openEdit(null),
  };
};
