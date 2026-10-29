import type { ChangeEvent } from "react";
import { Ban, Trash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CONTACT_ICONS, PAST_TONE } from "../../core/constants";
import { getInitials } from "../../../../utils/initials";
import { dateLabel } from "../../core/format";
import { getPastKey } from "../../core/model";
import type { StudioClient } from "../../core/types";
import { saveStudioClient } from "../save";
import type { ClientActions } from "./actions";
import { getFirstName, readImage } from "./context";
import type { ClientsContext } from "./context";
import { formatMoney } from "../../../../utils/money";

interface ContactAction {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface Contact {
  key: string;
  label: string;
  value: string;
  contactActions: ContactAction[];
}

const UPCOMING_TONES: Record<
  string,
  { label: string; background: string; foreground: string }
> = {
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
};

const getTone = (status: string) =>
  UPCOMING_TONES[status] || {
    label: status ? status[0]?.toUpperCase() + status.slice(1) : "Confirmed",
    background: "var(--quiet)",
    foreground: "var(--neutral-700,#3d3833)",
  };

const getContacts = (client: StudioClient, first: string) => {
  const phone = (client.phone || "").replace(/\s/g, "");
  const contacts: Contact[] = [];

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
          icon: CONTACT_ICONS.call,
        },
        {
          key: "t",
          label: `Text ${first}`,
          href: `sms:${phone}`,
          icon: CONTACT_ICONS.text,
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
          icon: CONTACT_ICONS.mail,
        },
      ],
    });

  return contacts;
};

const getProfile = (
  { state, setState, actions, getStats }: ClientsContext,
  client: StudioClient,
) => {
  const stats = getStats(client.id);
  const first = getFirstName(client);
  const notes = client.notes || {};
  const fromView = state.sheet === "cliView" ? client.id : null;

  const upcomingRows = stats.upcoming.map((booking) => {
    const tone = getTone(booking.status);

    return {
      key: `u${booking.id}`,
      service: booking.service,
      when: `${dateLabel(booking.dayOffset || 0)} · ${booking.time}`,
      price: `${formatMoney(booking.price)}`,
      isStruck: false,
      status: tone.label,
      statusBackground: tone.background,
      statusForeground: tone.foreground,
      open: () =>
        actions.openSheet("booking", {
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

    return {
      key: `p${index}-${row.pastId || ""}`,
      service: row.service,
      when: `${row.when} · ${row.time}`,
      price: `${formatMoney(row.price)}`,
      isStruck: row.status !== "Completed",
      status: row.status,
      statusBackground: tone.background,
      statusForeground: tone.color,
      open: () =>
        actions.openSheet("past", {
          selectedPastId: getPastKey(row),
          fromClientId: fromView,
        }),
    };
  });

  const isPastTab = state.clientAppointmentsTab === "past";
  const visits = client.visits || 0;

  return {
    name: client.name,
    first,
    img: client.img || "",
    initials: getInitials(client.name),
    subtitle: [
      visits + (visits === 1 ? " visit" : " visits"),
      client.since ? `Client since ${client.since}` : client.area || "",
    ]
      .filter(Boolean)
      .join(" · "),
    lastVisit: client.last ? `Last visit ${client.last}` : "No visits yet",
    isBlocked: !!client.blocked,
    contacts: getContacts(client, first),
    sensitivities: client.sensitivities || "",
    sensitivitiesNote:
      client.sensitivitiesNote || `Added by ${first} when they booked`,
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
    appointments: isPastTab ? pastRows : upcomingRows,
    appointmentsEmptyMessage: isPastTab
      ? `No past appointments with ${first} yet.`
      : `Nothing booked. Book ${first} in for their next visit.`,
    noShows: String(stats.noShows),
    lateCancel: String(stats.lateCancel),
    hasNoShows: !!stats.noShows,
    hasLateCancel: !!stats.lateCancel,
    money: [
      ["Total spend", `${formatMoney(client.spent || 0)}`],
      ["Deposits paid", `${formatMoney(stats.deposits)}`],
      ["Fees charged", `${formatMoney(stats.fees)}`],
      ["Refunds", `${formatMoney(stats.refunds)}`],
    ].map(([label, value]) => ({
      key: label ?? "",
      label: label ?? "",
      value: value ?? "",
    })),
  };
};

export const getProfileView = (
  context: ClientsContext,
  { openEdit, block, remove }: ClientActions,
) => {
  const { studio, actions, selected, setOverride } = context;

  return {
    profile: selected ? getProfile(context, selected) : null,
    onPhoto: (event: ChangeEvent<HTMLInputElement>) => {
      if (!selected) return;

      readImage(event, (url) => {
        const previous = studio.context.getState().clientOverrides;

        setOverride(selected.id, { img: url });

        saveStudioClient(studio.context, selected, url, {
          clientOverrides: previous,
        });

        actions.showToast("Photo updated");
      });
    },
    editSelected: () => selected && openEdit(selected),
    unblockSelected: () => selected && block(selected),
    bookSelected: () =>
      selected &&
      actions.openSheet("add", {
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
      actions.openActionSheet({
        title: selected.name,
        subtitle: "",
        items: [
          {
            label: selected.blocked ? "Unblock" : "Block from online booking",
            icon: Ban,
            run: () => block(selected),
          },
          {
            label: "Delete client",
            icon: Trash,
            danger: true,
            run: () => remove(selected),
          },
        ],
      }),
  };
};
