// Studio → Clients values: the list, the profile and the add / edit sheet.
import type { ChangeEvent, MouseEvent } from "react";
import { PAST_TONE } from "./studio-data";
import {
  dateLabel,
  getAvatarSrc,
  getInitials,
  timeToMinutes,
} from "./studio-format";
import {
  findDuplicate,
  getAllClients,
  getClient,
  getPastKey,
  getPastRows,
} from "./studio-model";
import type { DuplicateHit } from "./studio-model";
import type {
  PastRecord,
  StudioBooking,
  StudioClient,
  StudioState,
} from "./studio-types";
import type { StudioController } from "./use-studio";

const WARN = "#b5541f";

const CONTACT_ICONS = {
  call: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  text: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
};

/** A client's bookings, past visits and money. */
const getClientStats = (
  state: StudioState,
  id: string | null,
  isNew: boolean,
  seed: PastRecord[],
) => {
  const depositShare = (parseFloat(String(state.policy?.deposit)) || 20) / 100;

  const upcoming = state.bookings
    .filter(
      (booking) =>
        booking.client === id &&
        (booking.dayOffset || 0) >= 0 &&
        booking.status !== "cancelled",
    )
    .sort(
      (first, second) =>
        (first.dayOffset || 0) - (second.dayOffset || 0) ||
        timeToMinutes(first.time) - timeToMinutes(second.time),
    );

  const past = getPastRows(state, isNew, seed).filter(
    (row) => row.client === id,
  );

  const getFee = (row: PastRecord) =>
    parseFloat(String(row.feeLabel || "").replace(/[^0-9.]/g, "")) ||
    Math.round(row.price * depositShare);

  let fees = 0;
  let refunds = 0;
  let deposits = 0;

  for (const row of past) {
    if (
      (row.feeKept || row.status === "No show") &&
      !row.waived &&
      !row.feePending
    )
      fees += getFee(row);

    if (row.status === "Cancelled" && (!row.feeKept || row.waived))
      refunds += Math.round(row.price * depositShare);

    if (row.status === "Completed")
      deposits += Math.round(row.price * depositShare);
  }

  for (const booking of upcoming)
    if (booking.paid === "deposit" || booking.paid === "full")
      deposits += Math.round(booking.price * depositShare);

  return {
    upcoming,
    past,
    noShows: past.filter(({ status }) => status === "No show").length,
    lateCancel: past.filter(
      ({ status, feeKept }) => status === "Cancelled" && feeKept,
    ).length,
    fees,
    refunds,
    deposits,
    unpaidFee: past.some(({ feePending, waived }) => feePending && !waived),
  };
};

export interface DuplicateView {
  isOn: boolean;
  img?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  onSelect?: () => void;
}

/** The "already uses this phone / email" notice. */
export const getDuplicateView = (
  hit: DuplicateHit | null,
  cta: string,
  onSelect: (client: StudioClient) => void,
): DuplicateView => {
  if (!hit) return { isOn: false };

  const first = hit.client.name.split(" ")[0] ?? "";
  const fieldName = hit.field === "phone" ? "phone number" : "email";

  return {
    isOn: true,
    img: getAvatarSrc(hit.client),
    title: `${hit.client.name} already uses this ${fieldName}`,
    subtitle: "Each client needs their own phone number and email.",
    cta: cta.replace("{f}", first),
    onSelect: () => onSelect(hit.client),
  };
};

const parseDay = (value: string | undefined) => {
  const time = Date.parse(`${value || ""} 2026`);

  return isNaN(time) ? 0 : time;
};

export const getClientsView = (studio: StudioController) => {
  const { state, setState, isWide, isDesktop, isNew, actions, seedPast } =
    studio;

  const { openSheet, showToast, openActionSheet, closeSheet, scrollBody } =
    actions;

  // new accounts have no seed clients, but anyone they add themselves still belongs in the list
  const all = isNew
    ? state.extraClients
        .map(({ id }) => getClient(state, id))
        .filter(({ deleted }) => !deleted)
    : getAllClients(state);

  const query = (state.clientListQuery || "").trim().toLowerCase();
  const queryDigits = query.replace(/\s/g, "");

  const setOverride = (id: string | null, patch: Partial<StudioClient>) =>
    setState(({ clientOverrides }) => ({
      clientOverrides: {
        ...clientOverrides,
        [id ?? ""]: { ...clientOverrides[id ?? ""], ...patch },
      },
    }));

  const rows = all.map((client) => ({
    client,
    stats: getClientStats(state, client.id, isNew, seedPast),
  }));

  type Row = (typeof rows)[number];

  const counts: Record<string, number> = {
    all: rows.length,
    // eslint-disable-next-line id-length -- keyed by the "up" filter id
    up: rows.filter(({ stats }) => stats.upcoming.length).length,
    blocked: rows.filter(({ client }) => client.blocked).length,
  };

  const isMatch = ({ client }: Row) =>
    !query ||
    client.name.toLowerCase().includes(query) ||
    (client.email || "").toLowerCase().includes(query) ||
    (!!queryDigits &&
      (client.phone || "").replace(/\s/g, "").includes(queryDigits));

  const isInFilter = ({ client, stats }: Row) => {
    if (state.clientFilter === "up") return stats.upcoming.length > 0;

    return state.clientFilter === "blocked" ? !!client.blocked : true;
  };

  const nextKey = ({ stats }: Row) =>
    stats.upcoming.length
      ? (stats.upcoming[0]?.dayOffset || 0) * 1440 +
        timeToMinutes(stats.upcoming[0]?.time)
      : 1e9;

  const sorters: Record<string, (first: Row, second: Row) => number> = {
    next: (first, second) =>
      nextKey(first) - nextKey(second) ||
      parseDay(second.client.last) - parseDay(first.client.last),
    last: (first, second) =>
      parseDay(second.client.last) - parseDay(first.client.last),
    visits: (first, second) =>
      (second.client.visits || 0) - (first.client.visits || 0),
    // eslint-disable-next-line id-length -- keyed by the "az" sort option value
    az: (first, second) => first.client.name.localeCompare(second.client.name),
  };

  const list = rows
    .filter(isInFilter)
    .filter(isMatch)
    .sort(sorters[state.clientSort] ?? sorters.next);

  const getNextLabel = (upcoming: StudioBooking[]) =>
    upcoming.length
      ? `${dateLabel(upcoming[0]?.dayOffset || 0)}, ${upcoming[0]?.time}`
      : "None booked";

  const getMeta = ({ client, stats }: Row) => {
    if (stats.upcoming.length) {
      const nextLabel = getNextLabel(stats.upcoming);
      const lastNote = client.last ? ` · Last ${client.last}` : "";

      return `Next ${nextLabel}${lastNote}`;
    }

    return client.last ? `Last visit ${client.last}` : "No visits yet";
  };

  const clientRows = list.map(({ client, stats }, index) => ({
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
    open: () => {
      if (isWide) {
        openSheet("cliView", {
          selectedClientId: client.id,
          clientAppointmentsTab: "up",
          clientFromBookingId: null,
        });

        return;
      }

      setState({ selectedClientId: client.id, clientAppointmentsTab: "up" });
      scrollBody(0, false);
    },
  }));

  const isFiltered = !!query || state.clientFilter !== "all";

  const openEdit = (client: StudioClient | null) => {
    const notes = client?.notes || {};
    const parts = client ? client.name.split(" ") : [""];

    openSheet("clientEdit", {
      clientEditFromView: state.sheet === "cliView" && !!client,
      clientEdit: {
        id: client ? client.id : null,
        first: client ? (parts[0] ?? "") : "",
        last: client ? parts.slice(1).join(" ") : "",
        phone: client ? client.phone || "" : "",
        email: client ? client.email || "" : "",
        type: notes.type || "",
        size: notes.size || "",
        length: notes.length || "",
        products: notes.products || "",
        sensitivities: client ? client.sensitivities || "" : "",
      },
    });
  };

  const block = (client: StudioClient) => {
    const first = client.name.split(" ")[0] ?? "";

    if (client.blocked) {
      setOverride(client.id, { blocked: false });

      showToast(`${first} can book online again`, () =>
        setOverride(client.id, { blocked: true }),
      );

      return;
    }

    setState({
      confirm: {
        title: `Block ${first} from booking online?`,
        body: `${first} won’t be notified. You can still book them yourself, and their profile and history stay.`,
        yesLabel: "Block",
        noLabel: "Cancel",
        yes: () => {
          setState({ confirm: null });
          setOverride(client.id, { blocked: true });

          showToast(`${first} blocked from online booking`, () =>
            setOverride(client.id, { blocked: false }),
          );
        },
      },
    });
  };

  const remove = (client: StudioClient) => {
    const first = client.name.split(" ")[0] ?? "";
    const stats = getClientStats(state, client.id, isNew, seedPast);

    if (stats.upcoming.length) {
      const booking = stats.upcoming[0] as StudioBooking;
      const bookingDate = dateLabel(booking.dayOffset || 0);

      const upcomingNote =
        stats.upcoming.length === 1
          ? `${first} has a booking on ${bookingDate} at ${booking.time}. Cancel it`
          : `${first} has ${stats.upcoming.length} upcoming bookings. Cancel them`;

      setState({
        confirm: {
          title: `Cancel ${first}’s upcoming booking first`,
          body: `${upcomingNote}, then you can delete this client.`,
          yesLabel: "View booking",
          noLabel: "Close",
          yes: () => {
            setState({ confirm: null });
            openSheet("booking", { sheetBookingId: booking.id });
          },
        },
      });

      return;
    }

    if (stats.unpaidFee) {
      setState({
        confirm: {
          title: `Settle ${first}’s fee first`,
          body: "A cancellation fee is still pending. Waive it or let it charge, then you can delete this client.",
          yesLabel: "View appointments",
          noLabel: "Close",
          yes: () => setState({ confirm: null, clientAppointmentsTab: "past" }),
        },
      });

      return;
    }

    const blockNote = client.blocked
      ? " Deleting also removes the block, so they could book online again. Keep them blocked instead if you don’t want that."
      : "";

    setState({
      confirm: {
        title: `Delete ${first}?`,
        body: `This can’t be undone. ${first}’s details will be removed permanently.${blockNote}`,
        yesLabel: "Delete client",
        noLabel: "Keep client",
        yes: () => {
          if (studio.context.getState().sheet === "cliView") closeSheet();

          setState({ confirm: null, selectedClientId: null });
          setOverride(client.id, { deleted: true, blocked: false });
          showToast("Client deleted");
        },
      },
    });
  };

  // ---- the selected client's profile ----
  const selected = state.selectedClientId
    ? (all.find(({ id }) => id === state.selectedClientId) ?? null)
    : null;

  let profile: ReturnType<typeof getProfile> | null = null;

  const getProfile = (client: StudioClient) => {
    const stats = getClientStats(state, client.id, isNew, seedPast);
    const first = client.name.split(" ")[0] ?? "";
    const notes = client.notes || {};
    const fromView = state.sheet === "cliView" ? client.id : null;

    const getTone = (status: string) =>
      ({
        confirmed: {
          label: "Confirmed",
          background: "rgba(46,125,79,.1)",
          foreground: "#2e7d4f",
        },
        awaiting: {
          label: "Awaiting confirmation",
          background: "rgba(223,207,62,.28)",
          foreground: "#5c5010",
        },
        inprogress: {
          label: "In progress",
          background: "rgba(223,207,62,.28)",
          foreground: "#5c5010",
        },
      })[status] || {
        label: status
          ? status[0]?.toUpperCase() + status.slice(1)
          : "Confirmed",
        background: "var(--quiet)",
        foreground: "var(--neutral-700,#3d3833)",
      };

    const upcomingRows = stats.upcoming.map((booking) => {
      const tone = getTone(booking.status);

      return {
        key: `u${booking.id}`,
        service: booking.service,
        when: `${dateLabel(booking.dayOffset || 0)} · ${booking.time}`,
        price: `£${booking.price}`,
        isStruck: false,
        status: tone.label,
        statusBackground: tone.background,
        statusForeground: tone.foreground,
        open: () =>
          openSheet("booking", {
            sheetBookingId: booking.id,
            fromClientId: fromView,
          }),
      };
    });

    const pastRows = stats.past.map((row, index) => {
      const tone = PAST_TONE[row.status] ?? {
        background: "var(--quiet)",
        color: "var(--text-secondary)",
      };

      const isCompleted = row.status === "Completed";

      return {
        key: `p${index}-${row.pastId || ""}`,
        service: row.service,
        when: `${row.when} · ${row.time}`,
        price: `£${row.price}`,
        isStruck: !isCompleted,
        status: row.status,
        statusBackground: tone.background,
        statusForeground: tone.color,
        open: () =>
          openSheet("past", {
            selectedPastId: getPastKey(row),
            fromClientId: fromView,
          }),
      };
    });

    const phone = (client.phone || "").replace(/\s/g, "");

    const contacts: {
      key: string;
      label: string;
      value: string;
      contactActions: {
        key: string;
        label: string;
        href: string;
        iconPath: string;
      }[];
    }[] = [];

    if (client.phone)
      contacts.push({
        key: "ph",
        label: "Phone",
        value: client.phone,
        contactActions: [
          {
            key: "c",
            label: `Call ${first}`,
            href: `tel:${phone}`,
            iconPath: CONTACT_ICONS.call,
          },
          {
            key: "t",
            label: `Text ${first}`,
            href: `sms:${phone}`,
            iconPath: CONTACT_ICONS.text,
          },
        ],
      });

    if (client.email)
      contacts.push({
        key: "em",
        label: "Email",
        value: client.email,
        contactActions: [
          {
            key: "e",
            label: `Email ${first}`,
            href: `mailto:${client.email}`,
            iconPath: CONTACT_ICONS.mail,
          },
        ],
      });

    const isPastTab = state.clientAppointmentsTab === "past";
    const appointments = isPastTab ? pastRows : upcomingRows;

    return {
      name: client.name,
      first,
      img: client.img || "",
      initials: getInitials(client.name),
      subtitle: [
        (client.visits || 0) +
          ((client.visits || 0) === 1 ? " visit" : " visits"),
        client.since ? `Client since ${client.since}` : client.area || "",
      ]
        .filter(Boolean)
        .join(" · "),
      lastVisit: client.last ? `Last visit ${client.last}` : "No visits yet",
      isBlocked: !!client.blocked,
      contacts,
      sensitivities: client.sensitivities || "",
      products: notes.products || "",
      hairActionLabel: notes.products ? "Edit" : "Add",
      appointmentTabs: (
        [
          ["up", `Upcoming ${upcomingRows.length}`],
          ["past", `Past ${pastRows.length}`],
        ] as const
      ).map(([id, label]) => ({
        key: id,
        label,
        isOn: (id === "past") === isPastTab,
        onSelect: () => setState({ clientAppointmentsTab: id }),
      })),
      appointments,
      appointmentsEmptyMessage: isPastTab
        ? `No past appointments with ${first} yet.`
        : `Nothing booked. Book ${first} in for their next visit.`,
      noShows: String(stats.noShows),
      lateCancel: String(stats.lateCancel),
      hasNoShows: !!stats.noShows,
      hasLateCancel: !!stats.lateCancel,
      money: [
        ["Total spend", `£${client.spent || 0}`],
        ["Deposits paid", `£${stats.deposits}`],
        ["Fees charged", `£${stats.fees}`],
        ["Refunds", `£${stats.refunds}`],
      ].map(([label, value]) => ({
        key: label ?? "",
        label: label ?? "",
        value: value ?? "",
      })),
    };
  };

  if (selected) profile = getProfile(selected);

  // ---- the add / edit client sheet ----
  const draft = state.clientEdit;

  const patchDraft = (patch: Partial<NonNullable<StudioState["clientEdit"]>>) =>
    setState(({ clientEdit }) => ({
      clientEdit: clientEdit ? { ...clientEdit, ...patch } : clientEdit,
    }));

  const draftPhone = (draft?.phone || "").replace(/\s/g, "");
  const draftEmail = (draft?.email || "").trim().toLowerCase();

  const duplicate =
    state.sheet === "clientEdit" && draft
      ? findDuplicate(state, draft.phone, draft.email, draft.id)
      : null;

  const isDraftValid =
    !!(draft?.first || "").trim() && !!(draftPhone || draftEmail) && !duplicate;

  // clientEdit.img: undefined = untouched (use the client's saved photo), '' = removed, data URL = new pick
  const savedImage = draft?.id ? getClient(state, draft.id).img || "" : "";
  const draftImage = draft?.img !== undefined ? draft.img : savedImage;

  const readImage = (
    event: ChangeEvent<HTMLInputElement>,
    done: (url: string) => void,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => done(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveDraft = () => {
    if (!isDraftValid || !draft) return;

    const name = [(draft.first || "").trim(), (draft.last || "").trim()]
      .filter(Boolean)
      .join(" ");

    const data: Partial<StudioClient> = {
      name,
      phone: (draft.phone || "").trim(),
      email: (draft.email || "").trim(),
      sensitivities: (draft.sensitivities || "").trim(),
      notes: { products: (draft.products || "").trim() },
    };

    if (draft.img !== undefined) data.img = draft.img;

    if (draft.id) {
      setOverride(draft.id, data);

      if (state.clientEditFromView)
        openSheet("cliView", { selectedClientId: draft.id });
      else closeSheet();

      showToast("Changes saved");

      return;
    }

    const id = `c${Date.now()}`;

    setState({
      extraClients: state.extraClients.concat([
        {
          id,
          area: "",
          img: "",
          visits: 0,
          last: "",
          spent: 0,
          since: "Sep 2026",
          ...data,
          name,
        },
      ]),
    });

    closeSheet();

    window.setTimeout(() => {
      if (isWide) {
        setState({ tab: "clients" });

        openSheet("cliView", {
          selectedClientId: id,
          clientAppointmentsTab: "up",
        });
      } else {
        setState({
          tab: "clients",
          selectedClientId: id,
          clientAppointmentsTab: "up",
        });

        scrollBody(0, false);
      }
    }, 220);

    showToast(`${(draft.first || "").trim()} added`);
  };

  return {
    isTable: isDesktop,
    isList: !selected || isWide,
    isProfile: !!selected && !isWide,
    isProfileSheet: state.sheet === "cliView" && !!selected,
    filters: (
      [
        ["all", "All"],
        ["up", "Upcoming"],
        ["blocked", "Blocked"],
      ] as const
    ).map(([id, label]) => ({
      key: id,
      label,
      count: String(counts[id]),
      isOn: state.clientFilter === id,
      onSelect: () => setState({ clientFilter: id }),
    })),
    clientRows,
    emptyTitle:
      isFiltered && all.length ? "No clients match" : "No clients yet",
    emptyBody:
      isFiltered && all.length
        ? "Try another name, number or email, or clear the filter."
        : "Clients appear here after their first booking. You can also add one yourself.",
    emptyAction: isFiltered && all.length ? "Clear search" : "Add client",
    emptyGo:
      isFiltered && all.length
        ? () => setState({ clientListQuery: "", clientFilter: "all" })
        : () => openEdit(null),
    addClient: () => openEdit(null),
    profile,
    onPhoto: (event: ChangeEvent<HTMLInputElement>) => {
      if (!selected) return;

      readImage(event, (url) => {
        setOverride(selected.id, { img: url });
        showToast("Photo updated");
      });
    },
    editSelected: () => selected && openEdit(selected),
    bookSelected: () =>
      selected &&
      openSheet("add", {
        addStep: 2,
        addClient: selected.id,
        addWalkIn: false,
        addNew: null,
        addService: null,
        addDay: null,
        addTime: null,
        addCustom: false,
      }),
    moreSelected: () =>
      selected &&
      openActionSheet({
        title: selected.name,
        subtitle: "",
        items: [
          {
            label: selected.blocked ? "Unblock" : "Block from online booking",
            iconPath:
              "M4.9 4.9l14.2 14.2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
            run: () => block(selected),
          },
          {
            label: "Delete client",
            iconPath: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
            danger: true,
            run: () => remove(selected),
          },
        ],
      }),
    // add / edit sheet
    draft,
    patchDraft,
    draftImage,
    onDraftImage: (event: ChangeEvent<HTMLInputElement>) =>
      readImage(event, (url) => patchDraft({ img: url })),
    duplicate: getDuplicateView(duplicate, "View {f}", (client) =>
      openSheet("cliView", { selectedClientId: client.id }),
    ),
    isDraftValid,
    saveLabel: draft?.id ? "Save changes" : "Add client",
    saveDraft,
    cancelDraft: () => {
      if (state.clientEditFromView)
        openSheet("cliView", { selectedClientId: draft?.id ?? null });
      else closeSheet();
    },
    stop: (event: MouseEvent) => event.stopPropagation(),
    warn: WARN,
  };
};

export type ClientsView = ReturnType<typeof getClientsView>;
