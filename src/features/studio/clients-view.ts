// Studio → Clients values (prototype clientVals, cliStats, dupVals): the list, the profile and the add / edit sheet.
import type { ChangeEvent, MouseEvent } from "react";
import { PAST_TONE } from "./studio-data";
import { dateLabel, getAvatarSrc, getInitials, toMin } from "./studio-format";
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
const IC = {
  call: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  text: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
};

/** A client's bookings, past visits and money (prototype cliStats). */
export const getClientStats = (
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
        (booking.off || 0) >= 0 &&
        booking.status !== "cancelled",
    )
    .sort(
      (first, second) =>
        (first.off || 0) - (second.off || 0) ||
        toMin(first.time) - toMin(second.time),
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
    up: upcoming,
    past,
    noShows: past.filter(({ status }) => status === "No show").length,
    lateCx: past.filter(
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
  sub?: string;
  cta?: string;
  go?: () => void;
}

/** The "already uses this phone / email" notice (prototype dupVals). */
export const getDuplicateView = (
  hit: DuplicateHit | null,
  cta: string,
  go: (client: StudioClient) => void,
): DuplicateView => {
  if (!hit) return { isOn: false };
  const first = hit.c.name.split(" ")[0] ?? "";
  return {
    isOn: true,
    img: getAvatarSrc(hit.c),
    title:
      hit.c.name +
      " already uses this " +
      (hit.field === "phone" ? "phone number" : "email"),
    sub: "Each client needs their own phone number and email.",
    cta: cta.replace("{f}", first),
    go: () => go(hit.c),
  };
};

const parseDay = (value: string | undefined) => {
  const time = Date.parse((value || "") + " 2026");
  return isNaN(time) ? 0 : time;
};

export const getClientsView = (studio: StudioController) => {
  const { state, setState, isWide, isDesk, isNew, actions, seedPast } = studio;
  const { openSheet, toastMsg, openActs, closeSheet, scrollBody } = actions;
  // new accounts have no seed clients, but anyone they add themselves still belongs in the list
  const all = isNew
    ? state.extraClients
        .map(({ id }) => getClient(state, id))
        .filter(({ deleted }) => !deleted)
    : getAllClients(state);
  const query = (state.cliQ || "").trim().toLowerCase();
  const queryDigits = query.replace(/\s/g, "");
  const setOverride = (id: string | null, patch: Partial<StudioClient>) =>
    setState(({ cliOv }) => ({
      cliOv: { ...cliOv, [id ?? ""]: { ...cliOv[id ?? ""], ...patch } },
    }));
  const rows = all.map((client) => ({
    client,
    stats: getClientStats(state, client.id, isNew, seedPast),
  }));
  type Row = (typeof rows)[number];
  const counts: Record<string, number> = {
    all: rows.length,
    up: rows.filter(({ stats }) => stats.up.length).length,
    blocked: rows.filter(({ client }) => client.blocked).length,
  };
  const isMatch = ({ client }: Row) =>
    !query ||
    client.name.toLowerCase().includes(query) ||
    (client.email || "").toLowerCase().includes(query) ||
    (!!queryDigits &&
      (client.phone || "").replace(/\s/g, "").includes(queryDigits));
  const isInFilter = ({ client, stats }: Row) =>
    state.cliFilt === "up"
      ? stats.up.length > 0
      : state.cliFilt === "blocked"
        ? !!client.blocked
        : true;
  const nextKey = ({ stats }: Row) =>
    stats.up.length
      ? (stats.up[0]?.off || 0) * 1440 + toMin(stats.up[0]?.time)
      : 1e9;
  const sorters: Record<string, (first: Row, second: Row) => number> = {
    next: (first, second) =>
      nextKey(first) - nextKey(second) ||
      parseDay(second.client.last) - parseDay(first.client.last),
    last: (first, second) =>
      parseDay(second.client.last) - parseDay(first.client.last),
    visits: (first, second) =>
      (second.client.visits || 0) - (first.client.visits || 0),
    az: (first, second) => first.client.name.localeCompare(second.client.name),
  };
  const list = rows
    .filter(isInFilter)
    .filter(isMatch)
    .sort(sorters[state.cliSort] ?? sorters.next);
  const getNextLabel = (upcoming: StudioBooking[]) =>
    upcoming.length
      ? dateLabel(upcoming[0]?.off || 0) + ", " + upcoming[0]?.time
      : "None booked";
  const clientRows = list.map(({ client, stats }, index) => ({
    key: client.id ?? "",
    name: client.name,
    contact: client.phone || client.email || "No contact details",
    img: client.img || "",
    initials: getInitials(client.name),
    isBlocked: !!client.blocked,
    hasSens: !!client.sens,
    last: client.last || "No visits yet",
    next: getNextLabel(stats.up),
    hasNext: stats.up.length > 0,
    upCount: String(stats.up.length),
    noShows: stats.noShows,
    noShowLabel:
      stats.noShows + (stats.noShows === 1 ? " no-show" : " no-shows"),
    spend: "£" + (client.spent || 0),
    meta: stats.up.length
      ? "Next " +
        getNextLabel(stats.up) +
        (client.last ? " · Last " + client.last : "")
      : client.last
        ? "Last visit " + client.last
        : "No visits yet",
    dly: (Math.min(index, 10) * 0.04).toFixed(2) + "s",
    open: () => {
      if (isWide) {
        openSheet("cliView", {
          cliSel: client.id,
          cliApptTab: "up",
          cFromB: null,
        });
        return;
      }
      setState({ cliSel: client.id, cliApptTab: "up" });
      scrollBody(0, false);
    },
  }));
  const isFiltered = !!query || state.cliFilt !== "all";

  const openEdit = (client: StudioClient | null) => {
    const notes = client?.notes || {};
    const parts = client ? client.name.split(" ") : [""];
    openSheet("clientEdit", {
      ceFromView: state.sheet === "cliView" && !!client,
      ce: {
        id: client ? client.id : null,
        first: client ? (parts[0] ?? "") : "",
        last: client ? parts.slice(1).join(" ") : "",
        phone: client ? client.phone || "" : "",
        email: client ? client.email || "" : "",
        type: notes.type || "",
        size: notes.size || "",
        length: notes.length || "",
        products: notes.products || "",
        sens: client ? client.sens || "" : "",
      },
    });
  };
  const block = (client: StudioClient) => {
    const first = client.name.split(" ")[0] ?? "";
    if (client.blocked) {
      setOverride(client.id, { blocked: false });
      toastMsg(first + " can book online again", () =>
        setOverride(client.id, { blocked: true }),
      );
      return;
    }
    setState({
      confirm: {
        title: "Block " + first + " from booking online?",
        body:
          first +
          " won’t be notified. You can still book them yourself, and their profile and history stay.",
        yesLabel: "Block",
        noLabel: "Cancel",
        yes: () => {
          setState({ confirm: null });
          setOverride(client.id, { blocked: true });
          toastMsg(first + " blocked from online booking", () =>
            setOverride(client.id, { blocked: false }),
          );
        },
      },
    });
  };
  const remove = (client: StudioClient) => {
    const first = client.name.split(" ")[0] ?? "";
    const stats = getClientStats(state, client.id, isNew, seedPast);
    if (stats.up.length) {
      const booking = stats.up[0] as StudioBooking;
      setState({
        confirm: {
          title: "Cancel " + first + "’s upcoming booking first",
          body:
            (stats.up.length === 1
              ? first +
                " has a booking on " +
                dateLabel(booking.off || 0) +
                " at " +
                booking.time +
                ". Cancel it"
              : first +
                " has " +
                stats.up.length +
                " upcoming bookings. Cancel them") +
            ", then you can delete this client.",
          yesLabel: "View booking",
          noLabel: "Close",
          yes: () => {
            setState({ confirm: null });
            openSheet("booking", { sheetBId: booking.id });
          },
        },
      });
      return;
    }
    if (stats.unpaidFee) {
      setState({
        confirm: {
          title: "Settle " + first + "’s fee first",
          body: "A cancellation fee is still pending. Waive it or let it charge, then you can delete this client.",
          yesLabel: "View appointments",
          noLabel: "Close",
          yes: () => setState({ confirm: null, cliApptTab: "past" }),
        },
      });
      return;
    }
    setState({
      confirm: {
        title: "Delete " + first + "?",
        body:
          "This can’t be undone. " +
          first +
          "’s details will be removed permanently." +
          (client.blocked
            ? " Deleting also removes the block, so they could book online again. Keep them blocked instead if you don’t want that."
            : ""),
        yesLabel: "Delete client",
        noLabel: "Keep client",
        yes: () => {
          if (studio.context.getState().sheet === "cliView") closeSheet();
          setState({ confirm: null, cliSel: null });
          setOverride(client.id, { deleted: true, blocked: false });
          toastMsg("Client deleted");
        },
      },
    });
  };

  // ---- the selected client's profile ----
  const selected = state.cliSel
    ? (all.find(({ id }) => id === state.cliSel) ?? null)
    : null;
  let profile: ReturnType<typeof getProfile> | null = null;
  const getProfile = (client: StudioClient) => {
    const stats = getClientStats(state, client.id, isNew, seedPast);
    const first = client.name.split(" ")[0] ?? "";
    const notes = client.notes || {};
    const fromView = state.sheet === "cliView" ? client.id : null;
    const getTone = (status: string) =>
      ({
        confirmed: { l: "Confirmed", bg: "rgba(46,125,79,.1)", fg: "#2e7d4f" },
        awaiting: {
          l: "Awaiting confirmation",
          bg: "rgba(223,207,62,.28)",
          fg: "#5c5010",
        },
        inprogress: {
          l: "In progress",
          bg: "rgba(223,207,62,.28)",
          fg: "#5c5010",
        },
      })[status] || {
        l: status ? status[0]?.toUpperCase() + status.slice(1) : "Confirmed",
        bg: "var(--quiet)",
        fg: "var(--neutral-700,#3d3833)",
      };
    const upcomingRows = stats.up.map((booking) => {
      const tone = getTone(booking.status);
      return {
        key: "u" + booking.id,
        svc: booking.svc,
        when: dateLabel(booking.off || 0) + " · " + booking.time,
        price: "£" + booking.price,
        isStruck: false,
        status: tone.l,
        statusBg: tone.bg,
        statusFg: tone.fg,
        open: () =>
          openSheet("booking", { sheetBId: booking.id, fromCli: fromView }),
      };
    });
    const pastRows = stats.past.map((row, index) => {
      const tone = PAST_TONE[row.status] ?? {
        bg: "var(--quiet)",
        color: "var(--text-secondary)",
      };
      const isOk = row.status === "Completed";
      return {
        key: "p" + index + "-" + (row.pid || ""),
        svc: row.svc,
        when: row.when + " · " + row.time,
        price: "£" + row.price,
        isStruck: !isOk,
        status: row.status,
        statusBg: tone.bg,
        statusFg: tone.color,
        open: () =>
          openSheet("past", { pastSel: getPastKey(row), fromCli: fromView }),
      };
    });
    const phone = (client.phone || "").replace(/\s/g, "");
    const contacts: {
      key: string;
      label: string;
      value: string;
      acts: { key: string; label: string; href: string; d: string }[];
    }[] = [];
    if (client.phone)
      contacts.push({
        key: "ph",
        label: "Phone",
        value: client.phone,
        acts: [
          {
            key: "c",
            label: "Call " + first,
            href: "tel:" + phone,
            d: IC.call,
          },
          {
            key: "t",
            label: "Text " + first,
            href: "sms:" + phone,
            d: IC.text,
          },
        ],
      });
    if (client.email)
      contacts.push({
        key: "em",
        label: "Email",
        value: client.email,
        acts: [
          {
            key: "e",
            label: "Email " + first,
            href: "mailto:" + client.email,
            d: IC.mail,
          },
        ],
      });
    const isPastTab = state.cliApptTab === "past";
    const appointments = isPastTab ? pastRows : upcomingRows;
    return {
      name: client.name,
      first,
      img: client.img || "",
      initials: getInitials(client.name),
      sub: [
        (client.visits || 0) +
          ((client.visits || 0) === 1 ? " visit" : " visits"),
        client.since ? "Client since " + client.since : client.area || "",
      ]
        .filter(Boolean)
        .join(" · "),
      lastVisit: client.last ? "Last visit " + client.last : "No visits yet",
      isBlocked: !!client.blocked,
      contacts,
      sens: client.sens || "",
      products: notes.products || "",
      hairAct: notes.products ? "Edit" : "Add",
      apptTabs: (
        [
          ["up", "Upcoming " + upcomingRows.length],
          ["past", "Past " + pastRows.length],
        ] as const
      ).map(([id, label]) => ({
        key: id,
        label,
        isOn: (id === "past") === isPastTab,
        go: () => setState({ cliApptTab: id }),
      })),
      appointments,
      apptEmptyMsg: isPastTab
        ? "No past appointments with " + first + " yet."
        : "Nothing booked. Book " + first + " in for their next visit.",
      noShows: String(stats.noShows),
      lateCx: String(stats.lateCx),
      hasNoShows: !!stats.noShows,
      hasLateCx: !!stats.lateCx,
      money: [
        ["Total spend", "£" + (client.spent || 0)],
        ["Deposits paid", "£" + stats.deposits],
        ["Fees charged", "£" + stats.fees],
        ["Refunds", "£" + stats.refunds],
      ].map(([label, value]) => ({
        key: label ?? "",
        label: label ?? "",
        value: value ?? "",
      })),
    };
  };
  if (selected) profile = getProfile(selected);

  // ---- the add / edit client sheet ----
  const draft = state.ce;
  const patchDraft = (patch: Partial<NonNullable<StudioState["ce"]>>) =>
    setState(({ ce }) => ({ ce: ce ? { ...ce, ...patch } : ce }));
  const draftPhone = (draft?.phone || "").replace(/\s/g, "");
  const draftEmail = (draft?.email || "").trim().toLowerCase();
  const duplicate =
    state.sheet === "clientEdit" && draft
      ? findDuplicate(state, draft.phone, draft.email, draft.id)
      : null;
  const isDraftOk =
    !!(draft?.first || "").trim() && !!(draftPhone || draftEmail) && !duplicate;
  // ce.img: undefined = untouched (use the client's saved photo), '' = removed, data URL = new pick
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
    if (!isDraftOk || !draft) return;
    const name = [(draft.first || "").trim(), (draft.last || "").trim()]
      .filter(Boolean)
      .join(" ");
    const data: Partial<StudioClient> = {
      name,
      phone: (draft.phone || "").trim(),
      email: (draft.email || "").trim(),
      sens: (draft.sens || "").trim(),
      notes: { products: (draft.products || "").trim() },
    };
    if (draft.img !== undefined) data.img = draft.img;
    if (draft.id) {
      setOverride(draft.id, data);
      if (state.ceFromView) openSheet("cliView", { cliSel: draft.id });
      else closeSheet();
      toastMsg("Changes saved");
      return;
    }
    const id = "c" + Date.now();
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
        openSheet("cliView", { cliSel: id, cliApptTab: "up" });
      } else {
        setState({ tab: "clients", cliSel: id, cliApptTab: "up" });
        scrollBody(0, false);
      }
    }, 220);
    toastMsg((draft.first || "").trim() + " added");
  };

  return {
    isTable: isDesk,
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
      isOn: state.cliFilt === id,
      go: () => setState({ cliFilt: id }),
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
        ? () => setState({ cliQ: "", cliFilt: "all" })
        : () => openEdit(null),
    addClient: () => openEdit(null),
    profile,
    onPhoto: (event: ChangeEvent<HTMLInputElement>) => {
      if (!selected) return;
      readImage(event, (url) => {
        setOverride(selected.id, { img: url });
        toastMsg("Photo updated");
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
        addSvc: null,
        addDay: null,
        addTime: null,
        addCustom: false,
      }),
    moreSelected: () =>
      selected &&
      openActs({
        title: selected.name,
        sub: "",
        items: [
          {
            label: selected.blocked ? "Unblock" : "Block from online booking",
            d: "M4.9 4.9l14.2 14.2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
            run: () => block(selected),
          },
          {
            label: "Delete client",
            d: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
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
      openSheet("cliView", { cliSel: client.id }),
    ),
    isDraftOk,
    saveLabel: draft?.id ? "Save changes" : "Add client",
    saveDraft,
    cancelDraft: () => {
      if (state.ceFromView) openSheet("cliView", { cliSel: draft?.id ?? null });
      else closeSheet();
    },
    stop: (event: MouseEvent) => event.stopPropagation(),
    warn: WARN,
  };
};

export type ClientsView = ReturnType<typeof getClientsView>;
