// The "New booking" sheet's values and actions.
import type { ChangeEvent, MouseEvent } from "react";
import { getAddonPicker } from "./addon-picker";
import { getDuplicateView } from "./clients-view";
import { ICONS, SLOT_TIMES, TAXONOMY } from "./studio-data";
import {
  dayInfo,
  durationToMinutes,
  formatDateTime,
  getAvatarSrc,
  getInitialsImage,
  getMiniCalendarDays,
  parseNumber,
  parseWholeNumber,
  timeRange,
} from "./studio-format";
import {
  findDuplicate,
  getAllClients,
  getBookingBuffer,
  getClient,
  getConflicts,
  getProtectionExpiry,
  getProtectionNoun,
  getProtectionTotal,
  getSlots,
  getWorkingHours,
} from "./studio-model";
import type {
  AddonEditDraft,
  StudioAddon,
  StudioBooking,
  StudioService,
} from "./studio-types";
import type { StudioController } from "./use-studio";
import { LONG_MONTHS, formatDuration } from "../../utils/dates";
import { formatMoney } from "../../utils/money";

const EXTRA_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 45, 60].map((value) => ({
  key: value,
  value: String(value),
  label: value ? `${value} min` : "None",
}));

const HOUR_OPTIONS = Array.from({ length: 13 }, (_slot, index) => ({
  key: index,
  value: String(index),
  label: `${index}h`,
}));

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_slot, index) => ({
  key: index * 5,
  value: String(index * 5),
  label: `${index * 5}m`,
}));

const getAddonMinutes = ({ hours, min }: StudioAddon) =>
  parseWholeNumber(hours) * 60 + parseWholeNumber(min);

/** New booking: who, service (+ edit / add-ons), when, protection, notes. */
export const getAddBookingView = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;
  const { policy } = state;
  const now = new Date();

  const services = state.services.filter(
    ({ status }) => status !== "archived" && status !== "draft",
  );

  const client = state.addClient ? getClient(state, state.addClient) : null;

  const service: StudioService | null = state.addService
    ? (state.services.find(({ id }) => id === state.addService) ?? null)
    : null;

  const duration =
    state.addDuration ?? (service ? durationToMinutes(service.duration) : 60);

  const conflicts =
    state.addStep === 3 && service
      ? getConflicts(
          state,
          state.addDay,
          state.addTime,
          duration + (state.addExtra || 0),
          null,
        )
      : [];

  const query = (state.addClientQuery || "").trim().toLowerCase();

  const filtered = getAllClients(state).filter(
    ({ name, phone }) =>
      !query ||
      name.toLowerCase().includes(query) ||
      (phone || "").replace(/\s/g, "").includes(query.replace(/\s/g, "")),
  );

  const { addNew } = state;

  const duplicate = addNew
    ? findDuplicate(state, addNew.contact, addNew.email, null)
    : null;

  const isReady1 =
    !!state.addClient ||
    state.addWalkIn ||
    !!(
      addNew &&
      !duplicate &&
      addNew.name.trim() &&
      (addNew.contact.trim() || (addNew.email || "").trim())
    );

  const isProtectionSkipped = policy.mode === "none" || state.addWalkIn;
  const isReady2 = !!state.addService;

  const isReady3 =
    state.addDay != null &&
    !!state.addTime &&
    (conflicts.length === 0 || state.addOverlapAllowed);

  const isDisabled =
    (state.addStep === 1 && !isReady1) ||
    (state.addStep === 2 && !isReady2) ||
    (state.addStep === 3 && !isReady3);

  const lastStep = 5;
  const stepCount = isProtectionSkipped ? 4 : 5;

  const currentPrice = () =>
    parseNumber(state.addPrice ?? (service ? service.price : 0));

  const priceLabel = state.addPrice != null ? state.addPrice : service?.price;

  // ---- step 4: protection ----
  const protection = (() => {
    const price = Math.max(0, currentPrice());

    const getFirst = () => {
      if (state.addWalkIn) return "the client";

      if (client) return client.name.split(" ")[0] ?? "";

      if (addNew?.name) return addNew.name.trim().split(" ")[0] ?? "";

      return "the client";
    };

    const first = getFirst();
    const total = getProtectionTotal(state, price);
    const { mode } = policy;

    const expiry = formatDateTime(
      getProtectionExpiry(Date.now(), state.addDay, state.addTime),
    );

    const when =
      state.addDay != null && state.addTime
        ? `${dayInfo(state.addDay).label}, ${state.addTime}`
        : "your appointment";

    const totalLabel = formatMoney(total, { pence: "always" });

    const getSendSubtitle = () => {
      if (mode === "card")
        return `${first} accepts your policy and saves a card to confirm. Nothing is charged now.`;

      const paidFor =
        mode === "full"
          ? " (full price + booking fee)"
          : " (deposit + booking fee)";

      return `${first} accepts your policy and pays ${totalLabel}${paidFor} to confirm.`;
    };

    const sendSubtitle = getSendSubtitle();
    const { window: policyWindow } = policy;
    const chargeNoun = mode === "full" ? " payment" : " deposit";

    const preview =
      mode === "card"
        ? `Email and SMS: “Confirm your appointment with Tiwára's House on ${when}. Card details are required to hold the slot, with nothing charged now. Cancellation policy: free up to ${policyWindow} hrs before.” With a Confirm & save card link.`
        : `Email and SMS: “Confirm your appointment with Tiwára's House on ${when}. A ${totalLabel}${chargeNoun} is required. Cancellation policy: free up to ${policyWindow} hrs before.” With a Confirm & pay link.`;

    return {
      protectionNoun: getProtectionNoun(state),
      isProtectionSend: state.addProtection === "link",
      protectionFootnote:
        state.addProtection === "link"
          ? `Not confirmed in time? It auto-cancels on ${expiry} — 48 hrs from now, or 2 hrs before the start, whichever is first — and the slot is released.`
          : "The booking is confirmed straight away, and no cancellation or no-show fee can be charged on it.",
      protectionPreview: preview,
      protectionOptions: [
        { id: "link", label: "Send payment link", subtitle: sendSubtitle },
        {
          id: "none",
          label: "No protection for this booking",
          subtitle:
            "Confirmed straight away. It won't be protected against cancellations or no-shows.",
        },
      ].map(({ id, label, subtitle }) => ({
        key: id,
        label,
        subtitle,
        isOn: state.addProtection === id,
        pick: () => setState({ addProtection: id }),
      })),
    };
  })();

  // ---- step 2: services ----
  const serviceQuery = (state.addServiceQuery || "").toLowerCase();

  const toItems = (list: StudioService[]) =>
    list.map(({ id, name, duration: serviceDuration, price }) => ({
      key: id,
      name,
      duration: serviceDuration,
      priceLabel: `£${price}`,
      isOn: state.addService === id,
      pick: () =>
        setState({
          addService: id,
          addDuration: null,
          addPrice: null,
          addOverlapAllowed: false,
          addAddons: [],
          addExtra: 0,
        }),
    }));

  const isServiceMatch = ({ name }: StudioService) =>
    !serviceQuery || name.toLowerCase().includes(serviceQuery);

  const serviceGroups: {
    key: string;
    category: string;
    count: string;
    items: ReturnType<typeof toItems>;
  }[] = [];

  TAXONOMY.forEach(({ id, name }) => {
    const items = toItems(
      services.filter((item) => item.taxonomyId === id && isServiceMatch(item)),
    );

    if (items.length)
      serviceGroups.push({
        key: id,
        category: name,
        count: String(items.length),
        items,
      });
  });

  const rest = toItems(
    services.filter(
      (item) =>
        !TAXONOMY.some(({ id }) => id === item.taxonomyId) &&
        isServiceMatch(item),
    ),
  );

  if (rest.length)
    serviceGroups.push({
      key: "other",
      category: "Other",
      count: String(rest.length),
      items: rest,
    });

  // ---- step 2: this booking's add-ons ----
  const selected = state.addAddons || [];
  const overrides = state.addAddonOverrides || {};

  const getValue = (addon: StudioAddon) => {
    const override = overrides[addon.id];

    return {
      price:
        override?.price != null ? override.price : parseNumber(addon.price),
      minutes:
        override?.minutes != null ? override.minutes : getAddonMinutes(addon),
      quantity: override?.quantity || 1,
    };
  };

  const removeAddon = (addon: StudioAddon) => {
    const value = getValue(addon);
    const next = { ...overrides };

    delete next[addon.id];

    setState({
      addonEdit: null,
      addAddonOverrides: next,
      addAddons: selected.filter((id) => id !== addon.id),
      addPrice: String(
        Math.max(0, currentPrice() - value.price * value.quantity),
      ),
      addDuration: Math.max(5, duration - value.minutes * value.quantity),
    });
  };

  const saveAddon = (draft: AddonEditDraft) => {
    const addon = state.addons.find(({ id }) => id === draft.id);

    if (!addon) return;

    const value = getValue(addon);

    const next = {
      price: parseNumber(draft.price),
      minutes:
        (parseInt(draft.hours) || 0) * 60 + (parseInt(draft.minutes) || 0),
      quantity: parseInt(draft.quantity) || 1,
    };

    setState({
      addonEdit: null,
      addAddonOverrides: { ...overrides, [addon.id]: next },
      addPrice: String(
        Math.max(
          0,
          currentPrice() -
            value.price * value.quantity +
            next.price * next.quantity,
        ),
      ),
      addDuration: Math.max(
        5,
        duration -
          value.minutes * value.quantity +
          next.minutes * next.quantity,
      ),
    });
  };

  context.memo.saveAddonEdit = saveAddon;

  context.memo.removeAddonEdit = (id) => {
    const addon = state.addons.find((item) => item.id === id);

    if (addon) removeAddon(addon);
  };

  const addonRows = selected
    .map((id) => state.addons.find((addon) => addon.id === id))
    .filter((addon): addon is StudioAddon => !!addon)
    .map((addon) => {
      const value = getValue(addon);

      const openEdit = (event?: MouseEvent) => {
        event?.stopPropagation();

        setState({
          addonEdit: {
            context: "add",
            id: addon.id,
            name: addon.name,
            price: String(value.price),
            hours: String(Math.floor(value.minutes / 60)),
            minutes: String(value.minutes % 60),
            quantity: String(value.quantity),
          },
        });
      };

      const addonTotal = value.price * value.quantity;

      const timeNote = value.minutes
        ? ` · ${formatDuration(value.minutes * value.quantity)}`
        : " · no extra time";

      const quantityNote = value.quantity > 1 ? ` · ×${value.quantity}` : "";

      return {
        key: addon.id,
        name: addon.name + (value.quantity > 1 ? ` ×${value.quantity}` : ""),
        meta: `+£${addonTotal}${timeNote}`,
        edit: openEdit,
        menu: (event: MouseEvent) => {
          const host =
            (event.currentTarget as Element).closest?.("[data-aorow]") ??
            (event.currentTarget as Element);

          const rect = host.getBoundingClientRect?.();

          const anchor = rect
            ? {
                top: rect.bottom + 6,
                right: Math.max(12, window.innerWidth - rect.right),
              }
            : null;

          event.stopPropagation();

          actions.openActionSheet({
            title: addon.name,
            subtitle: `+£${addonTotal}${quantityNote}`,
            anchor,
            items: [
              { label: "Edit", iconPath: ICONS.edit, run: () => openEdit() },
              {
                label: "Remove",
                iconPath: ICONS.trash,
                danger: true,
                run: () => removeAddon(addon),
              },
            ],
          });
        },
      };
    });

  const foldAddon = (addon: StudioAddon) => ({
    addPrice: String(Math.max(0, currentPrice() + parseNumber(addon.price))),
    addDuration: Math.max(5, duration + getAddonMinutes(addon)),
  });

  const picker =
    state.sheet === "add" && state.addAddonPickerOpen
      ? getAddonPicker(
          studio,
          state,
          selected,
          (addon) =>
            setState({
              addAddons: selected.concat([addon.id]),
              ...foldAddon(addon),
            }),
          service?.categoryId,
          (addon) => context.memo.removeAddonEdit?.(addon.id),
        )
      : null;

  // ---- step 3: when ----
  const chip = <T>(value: T, current: T) => value === current;

  const slots = getSlots(
    state,
    state.addDay,
    duration,
    service ? getBookingBuffer(state, service.name) : 0,
    null,
  );

  const stepSlots =
    state.addStep === 3
      ? getSlots(
          state,
          state.addDay,
          duration,
          service ? getBookingBuffer(state, service.name) : 0,
          null,
        )
      : [];

  const isCustom =
    !!state.addCustom ||
    (state.addStep === 3 &&
      !!state.addTime &&
      stepSlots.indexOf(state.addTime) < 0);

  const dayDate = new Date();

  dayDate.setDate(dayDate.getDate() + (state.addDay || 0));

  const hours = state.hours[(dayDate.getDay() + 6) % 7] || {
    on: true,
    start: "09:00",
    end: "18:00",
  };

  const customTime = state.addTime || "";

  const isInRange =
    !customTime || !hours.on
      ? false
      : customTime >= hours.start && customTime < hours.end;

  const isOutside = isCustom && !!customTime && (!hours.on || !isInRange);

  const getCustomHint = () => {
    if (!hours.on) return "You’re closed this day. You can still book it.";

    if (isOutside)
      return `Outside your hours (${hours.start}–${hours.end}). You can still book it.`;

    return `Any time between ${hours.start} and ${hours.end}`;
  };

  const calendarMonth =
    state.calendarMonth == null ? now.getMonth() : state.calendarMonth;

  const calendarYear =
    state.calendarYear == null ? now.getFullYear() : state.calendarYear;

  const pickDay = (offset: number) =>
    setState({ addDay: offset, addOverlapAllowed: false });

  const firstName =
    state.addWalkIn || !client
      ? "the client"
      : (client.name.split(" ")[0] ?? "");

  const back = () => {
    if (state.addStep === 2 && state.addAddonPickerOpen) {
      setState({ addAddonPickerOpen: false });

      return;
    }

    if (state.addStep === 2 && state.addEditService) {
      setState({ addEditService: false });

      return;
    }

    if (addNew) {
      setState({ addNew: null });

      return;
    }

    setState({
      addStep:
        state.addStep === 5 && isProtectionSkipped
          ? 3
          : Math.max(1, state.addStep - 1),
    });
  };

  const next = () => {
    if (isDisabled) return;

    if (state.addStep === 2 && state.addAddonPickerOpen) {
      setState({ addAddonPickerOpen: false });

      return;
    }

    if (state.addStep === 2 && state.addEditService) {
      setState({ addEditService: false, addStep: 3 });

      return;
    }

    if (state.addStep === 1 && addNew) {
      const id = `c${Date.now()}`;

      const created = {
        id,
        name: addNew.name.trim(),
        phone: addNew.contact.trim(),
        email: (addNew.email || "").trim(),
        area: "",
        img: getInitialsImage(addNew.name),
        visits: 0,
        last: "—",
        spent: 0,
        fav: "",
      };

      setState({
        extraClients: state.extraClients.concat([created]),
        addClient: id,
        addNew: null,
        addStep: 2,
        ...(addNew.address.trim()
          ? {
              clientAddresses: {
                ...state.clientAddresses,
                [id]: addNew.address.trim(),
              },
            }
          : {}),
      });

      return;
    }

    if (state.addStep < lastStep) {
      setState({
        addStep:
          state.addStep === 3 && isProtectionSkipped ? 5 : state.addStep + 1,
      });

      return;
    }

    if (!service || state.addDay == null || !state.addTime) return;

    const id = Date.now();
    const price = Math.max(0, currentPrice());

    const protect =
      isProtectionSkipped || state.addProtection === "none" ? "none" : "link";

    const sentAt = Date.now();
    const address = state.addAddress.trim();
    const date = new Date();

    date.setDate(date.getDate() + state.addDay);

    const record: StudioBooking = {
      id,
      dayOffset: state.addDay,
      time: state.addTime,
      duration: formatDuration(duration),
      client: state.addWalkIn ? null : state.addClient,
      service: service.name,
      price,
      pending: false,
      status: protect === "link" ? "awaiting" : "confirmed",
      paid: protect === "link" ? "link" : "none",
      protect,
      stylistNote: state.addNote.trim(),
      address,
      walkIn: !!state.addWalkIn,
      protectionMode: protect === "link" ? policy.mode : "none",
    };

    if (state.addExtra) record.extra = state.addExtra;

    if (selected.length)
      record.addons = selected
        .map((addonId) => state.addons.find(({ id: key }) => key === addonId))
        .filter((addon): addon is StudioAddon => !!addon)
        .map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: parseNumber(addon.price),
          quantity: 1,
        }));

    if (protect === "link") {
      record.linkSentAt = sentAt;
      record.resends = 0;

      record.expiresAt = getProtectionExpiry(
        sentAt,
        state.addDay,
        state.addTime,
      );
    }

    setState({
      bookings: state.bookings.concat([record]),
      tab: "bookings",
      dayIndex: state.addDay,
      bookingsLayout: "cal",
      bookingCalendarMonth: date.getMonth(),
      bookingCalendarYear: date.getFullYear(),
      ...(address && state.addClient
        ? {
            clientAddresses: {
              ...state.clientAddresses,
              [state.addClient]: address,
            },
          }
        : {}),
    });

    const getWho = () => {
      if (state.addWalkIn) return "walk-in";

      return client ? (client.name.split(" ")[0] ?? "") : "client";
    };

    const who = getWho();
    const linkNote = protect === "link" ? ". Payment link sent" : "";

    actions.showToast(
      state.addWalkIn ? "Walk-in added" : `Booking added for ${who}${linkNote}`,
    );

    actions.closeSheet();
  };

  const conflictList = conflicts
    .map(({ name, range }) => `${name}, ${range}`)
    .join(" · ");

  const getSummary = () => {
    if (!client || !service || state.addDay == null || !state.addTime)
      return "Pick a day and time to see the summary.";

    const { label: dayLabel } = dayInfo(state.addDay);
    const slotRange = timeRange(state.addTime, formatDuration(duration));

    return `${client.name} · ${service.name} · ${dayLabel}, ${slotRange} · £${priceLabel}`;
  };

  return {
    steps: Array.from({ length: stepCount }, (_slot, index) => index + 1).map(
      (step) => ({
        key: step,
        isOn:
          (isProtectionSkipped && state.addStep === 5 ? 5 : state.addStep) >=
          (step === 4 && isProtectionSkipped ? 5 : step),
      }),
    ),
    isStep1: state.addStep === 1,
    isStep3: state.addStep === 3,
    isStep4: state.addStep === 4 && !isProtectionSkipped,
    isStep5: state.addStep === 5,
    // step 1
    isWalkIn: !!state.addWalkIn,
    pickWalkIn: () =>
      setState({
        addWalkIn: true,
        addClient: null,
        addNew: null,
        addStep: 2,
      }),
    clientQuery: state.addClientQuery,
    onClientQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addClientQuery: event.target.value }),
    clients: filtered.map((item, index) => ({
      key: item.id ?? String(index),
      delay: `${(Math.min(index, 8) * 0.03 + 0.03).toFixed(2)}s`,
      name: item.name,
      imgSrc: getAvatarSrc(item),
      subtitle: item.phone || item.area || "",
      isOn: state.addClient === item.id,
      pick: () =>
        setState({
          addClient: item.id,
          addNew: null,
          addWalkIn: false,
          addStep: 2,
        }),
    })),
    isNoMatch: !!query && filtered.length === 0,
    newClient: addNew,
    duplicate: getDuplicateView(duplicate, "Book for {f} instead", (hit) =>
      setState({
        addClient: hit.id,
        addNew: null,
        addWalkIn: false,
        addStep: 2,
      }),
    ),
    newLabel:
      query && filtered.length === 0
        ? `Add “${state.addClientQuery.trim()}” as a new client`
        : "New client",
    toggleNew: () =>
      setState({
        addNew: addNew
          ? null
          : {
              name: query ? state.addClientQuery.trim() : "",
              contact: "",
              email: "",
              address: "",
            },
        addClient: null,
      }),
    patchNew: (patch: Partial<NonNullable<typeof addNew>>) =>
      setState({
        addNew: {
          ...(addNew ?? { name: "", contact: "", email: "", address: "" }),
          ...patch,
        },
      }),
    isAddressShown: !!state.profile.mobile,
    // step 2
    isServiceList: state.addStep === 2 && !state.addEditService,
    isServiceEdit:
      state.addStep === 2 &&
      !!state.addEditService &&
      !!service &&
      !state.addAddonPickerOpen,
    isAddonPick: state.addStep === 2 && !!state.addAddonPickerOpen,
    serviceQuery: state.addServiceQuery || "",
    onServiceQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addServiceQuery: event.target.value }),
    serviceGroups,
    isServiceEmpty: serviceGroups.length === 0,
    isServicePicked: !!service,
    selectedName: service ? service.name : "",
    selectedMeta: service
      ? [
          formatDuration(duration),
          `£${priceLabel}`,
          selected.length
            ? selected.length + (selected.length === 1 ? " add-on" : " add-ons")
            : "",
          state.addExtra ? `+${state.addExtra}m after` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    openEdit: () => setState({ addEditService: true }),
    closeEdit: () => setState({ addEditService: false }),
    extraValue: String(state.addExtra || 0),
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      setState({ addExtra: Number(event.target.value) }),
    extraOptions: EXTRA_OPTIONS,
    durationHours: String(Math.floor(duration / 60)),
    durationMinutes: String(duration % 60),
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    onDurationHours: (event: ChangeEvent<HTMLSelectElement>) => {
      const value = Math.max(
        0,
        Math.min(12, parseInt(event.target.value) || 0),
      );

      setState({
        addDuration: Math.max(5, value * 60 + (duration % 60)),
        addOverlapAllowed: false,
      });
    },
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) => {
      const value = Math.max(
        0,
        Math.min(55, parseInt(event.target.value) || 0),
      );

      setState({
        addDuration: Math.max(5, Math.floor(duration / 60) * 60 + value),
        addOverlapAllowed: false,
      });
    },
    priceValue: String(state.addPrice ?? service?.price ?? ""),
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addPrice: event.target.value }),
    isAdjusted:
      !!service &&
      ((state.addDuration != null &&
        state.addDuration !== durationToMinutes(service.duration)) ||
        (state.addPrice != null && state.addPrice !== String(service.price))),
    resetAdjustments: () =>
      setState({
        addDuration: null,
        addPrice: null,
        addAddons: [],
        addExtra: 0,
      }),
    addonRows,
    openAddons: () =>
      setState({
        addAddonPickerOpen: true,
        addAddonQuery: "",
        addAddonCategory: null,
      }),
    picker,
    addonDialog: (draft: AddonEditDraft) => ({
      remove: () => context.memo.removeAddonEdit?.(draft.id ?? ""),
      save: () => context.memo.saveAddonEdit?.(draft),
    }),
    // step 3
    isCalendarOpen: state.calendarOpen,
    toggleCalendar: () =>
      setState({
        calendarOpen: !state.calendarOpen,
        calendarMonth:
          state.calendarMonth == null ? now.getMonth() : state.calendarMonth,
        calendarYear:
          state.calendarYear == null ? now.getFullYear() : state.calendarYear,
      }),
    calendarTitle: `${LONG_MONTHS[calendarMonth]} ${calendarYear}`,
    calendarDays: getMiniCalendarDays(
      calendarMonth,
      calendarYear,
      state.addDay,
      pickDay,
      0,
    ),
    days: Array.from({ length: 8 }, (_slot, offset) => {
      const info = dayInfo(offset);

      return {
        key: offset,
        weekday: info.weekday,
        dayNumber: info.dayNumber,
        isOn: chip(state.addDay, offset),
        pick: () => pickDay(offset),
      };
    }),
    times: slots.map((time) => ({
      key: time,
      label: time,
      isOn: chip(state.addTime, time),
      pick: () =>
        setState({ addTime: time, addCustom: false, addOverlapAllowed: false }),
    })),
    isNoSlots: state.addDay != null && slots.length === 0,
    noSlotsText: getWorkingHours(state, state.addDay || 0).on
      ? "No free 30-minute starts left this day. Use a custom time if you want to squeeze it in."
      : "You’re closed this day. Use a custom time to book it anyway.",
    isCustom,
    toggleCustom: () =>
      setState({
        addCustom: !isCustom,
        addTime:
          isCustom || SLOT_TIMES.includes(state.addTime ?? "")
            ? null
            : state.addTime,
      }),
    customTime,
    onCustomTime: (event: ChangeEvent<HTMLInputElement>) =>
      setState({
        addTime: event.target.value || null,
        addOverlapAllowed: false,
      }),
    customMinutes: hours.on ? hours.start : "00:00",
    customMax: hours.on ? hours.end : "23:59",
    customHint: getCustomHint(),
    isCustomWarn: isOutside || !hours.on,
    hasConflict: conflicts.length > 0,
    conflictBody: `${conflictList}. Tick below if you want to double up.`,
    isOverlapAllowed: state.addOverlapAllowed,
    toggleOverlap: () =>
      setState({ addOverlapAllowed: !state.addOverlapAllowed }),
    summary: getSummary(),
    // step 4
    ...protection,
    firstName,
    // step 5
    isAddressAsked: !!state.profile.mobile && !!client && !client.address,
    addressValue: state.addAddress,
    onAddress: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addAddress: event.target.value }),
    note: state.addNote,
    onNote: (event: ChangeEvent<HTMLTextAreaElement>) =>
      setState({ addNote: event.target.value }),
    // footer
    isDisabled,
    cta: state.addStep < lastStep ? "Continue" : "Confirm booking",
    canBack: state.addStep > 1 || !!addNew,
    back,
    next,
  };
};

export type AddBookingView = ReturnType<typeof getAddBookingView>;
