// The "New booking" sheet's values and actions (prototype renderVals: shAdd, add*, asv, aa2, prot*, cal*).
import type { ChangeEvent, MouseEvent } from "react";
import { getAddonPicker } from "./addon-picker";
import { getDuplicateView } from "./clients-view";
import { ICONS, MONTHS_LONG, SLOT_TIMES, TAXONOMY } from "./studio-data";
import {
  dayInfo,
  durToMin,
  fmtDT,
  fmtDur,
  getAvatarSrc,
  getInitialsImage,
  getMiniCalDays,
  minToDur,
  timeRange,
} from "./studio-format";
import {
  findDuplicate,
  getAllClients,
  getBookingBuffer,
  getClient,
  getConflicts,
  getProtExpiry,
  getProtNoun,
  getProtTotal,
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

const EXTRA_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 45, 60].map((value) => ({
  key: value,
  v: String(value),
  label: value ? value + " min" : "None",
}));
const HOUR_OPTIONS = Array.from({ length: 13 }, (_, index) => ({
  key: index,
  v: String(index),
  label: index + "h",
}));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  key: index * 5,
  v: String(index * 5),
  label: index * 5 + "m",
}));

const toNumber = (value: unknown) => parseFloat(String(value ?? "")) || 0;
const getAddonMinutes = ({ hr, min }: StudioAddon) =>
  (parseInt(String(hr)) || 0) * 60 + (parseInt(String(min)) || 0);

/** New booking: who, service (+ edit / add-ons), when, protection, notes (prototype shAdd). */
export const getAddBookingView = (studio: StudioController) => {
  const { state, setState, actions, context } = studio;
  const { policy } = state;
  const now = new Date();

  const services = state.services.filter(
    ({ st }) => st !== "archived" && st !== "draft",
  );
  const client = state.addClient ? getClient(state, state.addClient) : null;
  const service: StudioService | null = state.addSvc
    ? (state.services.find(({ id }) => id === state.addSvc) ?? null)
    : null;
  const duration =
    state.addDur != null ? state.addDur : service ? durToMin(service.dur) : 60;
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
  const query = (state.addQ || "").trim().toLowerCase();
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
  const isProtSkipped = policy.mode === "none" || state.addWalkIn;
  const isReady2 = !!state.addSvc;
  const isReady3 =
    state.addDay != null &&
    !!state.addTime &&
    (conflicts.length === 0 || state.addOverlapOk);
  const isDisabled =
    (state.addStep === 1 && !isReady1) ||
    (state.addStep === 2 && !isReady2) ||
    (state.addStep === 3 && !isReady3);
  const lastStep = 5;
  const stepCount = isProtSkipped ? 4 : 5;
  const currentPrice = () =>
    toNumber(
      state.addPrice != null ? state.addPrice : service ? service.price : 0,
    );
  const priceLabel = state.addPrice != null ? state.addPrice : service?.price;

  // ---- step 4: protection ----
  const protection = (() => {
    const price = Math.max(0, currentPrice());
    const first = state.addWalkIn
      ? "the client"
      : client
        ? (client.name.split(" ")[0] ?? "")
        : addNew?.name
          ? (addNew.name.trim().split(" ")[0] ?? "")
          : "the client";
    const total = getProtTotal(state, price);
    const { mode } = policy;
    const money = (value: number) => "£" + value.toFixed(2);
    const expiry = fmtDT(
      getProtExpiry(Date.now(), state.addDay, state.addTime),
    );
    const when =
      state.addDay != null && state.addTime
        ? dayInfo(state.addDay).label + ", " + state.addTime
        : "your appointment";
    const sendSub =
      mode === "card"
        ? first +
          " accepts your policy and saves a card to confirm. Nothing is charged now."
        : mode === "full"
          ? first +
            " accepts your policy and pays " +
            money(total) +
            " (full price + booking fee) to confirm."
          : first +
            " accepts your policy and pays " +
            money(total) +
            " (deposit + booking fee) to confirm.";
    const preview =
      mode === "card"
        ? "Email and SMS: “Confirm your appointment with Tiwára's House on " +
          when +
          ". Card details are required to hold the slot, with nothing charged now. Cancellation policy: free up to " +
          policy.window +
          " hrs before.” With a Confirm & save card link."
        : "Email and SMS: “Confirm your appointment with Tiwára's House on " +
          when +
          ". A " +
          money(total) +
          (mode === "full" ? " payment" : " deposit") +
          " is required. Cancellation policy: free up to " +
          policy.window +
          " hrs before.” With a Confirm & pay link.";
    return {
      protNoun: getProtNoun(state),
      isProtSend: state.addProt === "link",
      protFoot:
        state.addProt === "link"
          ? "Not confirmed in time? It auto-cancels on " +
            expiry +
            " — 48 hrs from now, or 2 hrs before the start, whichever is first — and the slot is released."
          : "The booking is confirmed straight away, and no cancellation or no-show fee can be charged on it.",
      protPreview: preview,
      protOptions: [
        { id: "link", label: "Send payment link", sub: sendSub },
        {
          id: "none",
          label: "No protection for this booking",
          sub: "Confirmed straight away. It won't be protected against cancellations or no-shows.",
        },
      ].map(({ id, label, sub }) => ({
        key: id,
        label,
        sub,
        isOn: state.addProt === id,
        pick: () => setState({ addProt: id }),
      })),
    };
  })();

  // ---- step 2: services ----
  const serviceQuery = (state.addSvcQ || "").toLowerCase();
  const toItems = (list: StudioService[]) =>
    list.map(({ id, name, dur, price }) => ({
      key: id,
      name,
      dur,
      priceLabel: "£" + price,
      isOn: state.addSvc === id,
      pick: () =>
        setState({
          addSvc: id,
          addDur: null,
          addPrice: null,
          addOverlapOk: false,
          addAddons: [],
          addExtra: 0,
        }),
    }));
  const isServiceMatch = ({ name }: StudioService) =>
    !serviceQuery || name.toLowerCase().includes(serviceQuery);
  const serviceGroups: {
    key: string;
    cat: string;
    n: string;
    items: ReturnType<typeof toItems>;
  }[] = [];
  TAXONOMY.forEach(({ id, name }) => {
    const items = toItems(
      services.filter((item) => item.cat === id && isServiceMatch(item)),
    );
    if (items.length)
      serviceGroups.push({
        key: id,
        cat: name,
        n: String(items.length),
        items,
      });
  });
  const rest = toItems(
    services.filter(
      (item) =>
        !TAXONOMY.some(({ id }) => id === item.cat) && isServiceMatch(item),
    ),
  );
  if (rest.length)
    serviceGroups.push({
      key: "other",
      cat: "Other",
      n: String(rest.length),
      items: rest,
    });

  // ---- step 2: this booking's add-ons ----
  const selected = state.addAddons || [];
  const overrides = state.addAoOv || {};
  const getValue = (addon: StudioAddon) => {
    const override = overrides[addon.id];
    return {
      price: override?.price != null ? override.price : toNumber(addon.price),
      mins: override?.mins != null ? override.mins : getAddonMinutes(addon),
      qty: override?.qty || 1,
    };
  };
  const removeAddon = (addon: StudioAddon) => {
    const value = getValue(addon);
    const next = { ...overrides };
    delete next[addon.id];
    setState({
      esAddon: null,
      addAoOv: next,
      addAddons: selected.filter((id) => id !== addon.id),
      addPrice: String(Math.max(0, currentPrice() - value.price * value.qty)),
      addDur: Math.max(5, duration - value.mins * value.qty),
    });
  };
  const saveAddon = (draft: AddonEditDraft) => {
    const addon = state.addons.find(({ id }) => id === draft.id);
    if (!addon) return;
    const value = getValue(addon);
    const next = {
      price: toNumber(draft.price),
      mins: (parseInt(draft.hrs) || 0) * 60 + (parseInt(draft.mins) || 0),
      qty: parseInt(draft.qty) || 1,
    };
    setState({
      esAddon: null,
      addAoOv: { ...overrides, [addon.id]: next },
      addPrice: String(
        Math.max(
          0,
          currentPrice() - value.price * value.qty + next.price * next.qty,
        ),
      ),
      addDur: Math.max(
        5,
        duration - value.mins * value.qty + next.mins * next.qty,
      ),
    });
  };
  context.memo.aoSave = saveAddon;
  context.memo.aoRemove = (id) => {
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
          esAddon: {
            ctx: "add",
            id: addon.id,
            name: addon.name,
            price: String(value.price),
            hrs: String(Math.floor(value.mins / 60)),
            mins: String(value.mins % 60),
            qty: String(value.qty),
          },
        });
      };
      return {
        key: addon.id,
        name: addon.name + (value.qty > 1 ? " ×" + value.qty : ""),
        meta:
          "+£" +
          value.price * value.qty +
          (value.mins
            ? " · " + minToDur(value.mins * value.qty)
            : " · no extra time"),
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
          actions.openActs({
            title: addon.name,
            sub:
              "+£" +
              value.price * value.qty +
              (value.qty > 1 ? " · ×" + value.qty : ""),
            anchor,
            items: [
              { label: "Edit", d: ICONS.edit, run: () => openEdit() },
              {
                label: "Remove",
                d: ICONS.trash,
                danger: true,
                run: () => removeAddon(addon),
              },
            ],
          });
        },
      };
    });
  const foldAddon = (addon: StudioAddon) => ({
    addPrice: String(Math.max(0, currentPrice() + toNumber(addon.price))),
    addDur: Math.max(5, duration + getAddonMinutes(addon)),
  });
  const picker =
    state.sheet === "add" && state.addAoPick
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
          (addon) => context.memo.aoRemove?.(addon.id),
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
    s: "09:00",
    e: "18:00",
  };
  const customTime = state.addTime || "";
  const isInRange =
    !customTime || !hours.on
      ? false
      : customTime >= hours.s && customTime < hours.e;
  const isOutside = isCustom && !!customTime && (!hours.on || !isInRange);
  const calMonth = state.calM == null ? now.getMonth() : state.calM;
  const calYear = state.calY == null ? now.getFullYear() : state.calY;
  const pickDay = (offset: number) =>
    setState({ addDay: offset, addOverlapOk: false });

  const firstName = state.addWalkIn
    ? "the client"
    : client
      ? (client.name.split(" ")[0] ?? "")
      : "the client";

  const back = () => {
    if (state.addStep === 2 && state.addAoPick) {
      setState({ addAoPick: false });
      return;
    }
    if (state.addStep === 2 && state.addEditSvc) {
      setState({ addEditSvc: false });
      return;
    }
    if (addNew) {
      setState({ addNew: null });
      return;
    }
    setState({
      addStep:
        state.addStep === 5 && isProtSkipped
          ? 3
          : Math.max(1, state.addStep - 1),
    });
  };

  const next = () => {
    if (isDisabled) return;
    if (state.addStep === 2 && state.addAoPick) {
      setState({ addAoPick: false });
      return;
    }
    if (state.addStep === 2 && state.addEditSvc) {
      setState({ addEditSvc: false, addStep: 3 });
      return;
    }
    if (state.addStep === 1 && addNew) {
      const id = "c" + Date.now();
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
        ...(addNew.addr.trim()
          ? { clientAddrs: { ...state.clientAddrs, [id]: addNew.addr.trim() } }
          : {}),
      });
      return;
    }
    if (state.addStep < lastStep) {
      setState({
        addStep: state.addStep === 3 && isProtSkipped ? 5 : state.addStep + 1,
      });
      return;
    }
    if (!service || state.addDay == null || !state.addTime) return;
    const id = Date.now();
    const price = Math.max(0, currentPrice());
    const protect = isProtSkipped || state.addProt === "none" ? "none" : "link";
    const sentAt = Date.now();
    const addr = state.addAddr.trim();
    const date = new Date();
    date.setDate(date.getDate() + state.addDay);
    const record: StudioBooking = {
      id,
      off: state.addDay,
      time: state.addTime,
      dur: minToDur(duration),
      client: state.addWalkIn ? null : state.addClient,
      svc: service.name,
      price,
      pending: false,
      status: protect === "link" ? "awaiting" : "confirmed",
      paid: protect === "link" ? "link" : "none",
      protect,
      stylistNote: state.addNote.trim(),
      addr,
      walkIn: !!state.addWalkIn,
      protMode: protect === "link" ? policy.mode : "none",
    };
    if (state.addExtra) record.extra = state.addExtra;
    if (selected.length)
      record.addons = selected
        .map((addonId) => state.addons.find(({ id: key }) => key === addonId))
        .filter((addon): addon is StudioAddon => !!addon)
        .map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: toNumber(addon.price),
          qty: 1,
        }));
    if (protect === "link") {
      record.linkSentAt = sentAt;
      record.resends = 0;
      record.expiresAt = getProtExpiry(sentAt, state.addDay, state.addTime);
    }
    setState({
      bookings: state.bookings.concat([record]),
      tab: "bookings",
      dayIdx: state.addDay,
      bview: "cal",
      bkCalM: date.getMonth(),
      bkCalY: date.getFullYear(),
      ...(addr && state.addClient
        ? { clientAddrs: { ...state.clientAddrs, [state.addClient]: addr } }
        : {}),
    });
    const who = state.addWalkIn
      ? "walk-in"
      : client
        ? (client.name.split(" ")[0] ?? "")
        : "client";
    actions.toastMsg(
      state.addWalkIn
        ? "Walk-in added"
        : "Booking added for " +
            who +
            (protect === "link" ? ". Payment link sent" : ""),
    );
    actions.closeSheet();
  };

  return {
    steps: Array.from({ length: stepCount }, (_, index) => index + 1).map(
      (step) => ({
        key: step,
        isOn:
          (isProtSkipped && state.addStep === 5 ? 5 : state.addStep) >=
          (step === 4 && isProtSkipped ? 5 : step),
      }),
    ),
    isStep1: state.addStep === 1,
    isStep3: state.addStep === 3,
    isStep4: state.addStep === 4 && !isProtSkipped,
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
    addQ: state.addQ,
    onAddQ: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addQ: event.target.value }),
    clients: filtered.map((item, index) => ({
      key: item.id ?? String(index),
      delay: (Math.min(index, 8) * 0.03 + 0.03).toFixed(2) + "s",
      name: item.name,
      imgSrc: getAvatarSrc(item),
      sub: item.phone || item.area || "",
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
        ? "Add “" + state.addQ.trim() + "” as a new client"
        : "New client",
    toggleNew: () =>
      setState({
        addNew: addNew
          ? null
          : {
              name: query ? state.addQ.trim() : "",
              contact: "",
              email: "",
              addr: "",
            },
        addClient: null,
      }),
    patchNew: (patch: Partial<NonNullable<typeof addNew>>) =>
      setState({
        addNew: {
          ...(addNew ?? { name: "", contact: "", email: "", addr: "" }),
          ...patch,
        },
      }),
    isAddrShown: !!state.profile.mobile,
    // step 2
    isServiceList: state.addStep === 2 && !state.addEditSvc,
    isServiceEdit:
      state.addStep === 2 &&
      !!state.addEditSvc &&
      !!service &&
      !state.addAoPick,
    isAddonPick: state.addStep === 2 && !!state.addAoPick,
    serviceQ: state.addSvcQ || "",
    onServiceQ: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addSvcQ: event.target.value }),
    serviceGroups,
    isServiceEmpty: serviceGroups.length === 0,
    isServicePicked: !!service,
    selectedName: service ? service.name : "",
    selectedMeta: service
      ? [
          fmtDur(Math.floor(duration / 60), duration % 60),
          "£" + priceLabel,
          selected.length
            ? selected.length + (selected.length === 1 ? " add-on" : " add-ons")
            : "",
          state.addExtra ? "+" + state.addExtra + "m after" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    openEdit: () => setState({ addEditSvc: true }),
    closeEdit: () => setState({ addEditSvc: false }),
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
        addDur: Math.max(5, value * 60 + (duration % 60)),
        addOverlapOk: false,
      });
    },
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) => {
      const value = Math.max(
        0,
        Math.min(55, parseInt(event.target.value) || 0),
      );
      setState({
        addDur: Math.max(5, Math.floor(duration / 60) * 60 + value),
        addOverlapOk: false,
      });
    },
    priceValue:
      state.addPrice != null
        ? String(state.addPrice)
        : service
          ? String(service.price)
          : "",
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addPrice: event.target.value }),
    isAdjusted:
      !!service &&
      ((state.addDur != null && state.addDur !== durToMin(service.dur)) ||
        (state.addPrice != null && state.addPrice !== String(service.price))),
    resetAdjustments: () =>
      setState({ addDur: null, addPrice: null, addAddons: [], addExtra: 0 }),
    addonRows,
    openAddons: () => setState({ addAoPick: true, aaQ: "", aaCat: null }),
    picker,
    addonDialog: (draft: AddonEditDraft) => ({
      remove: () => context.memo.aoRemove?.(draft.id ?? ""),
      save: () => context.memo.aoSave?.(draft),
    }),
    // step 3
    isCalOpen: state.calOpen,
    toggleCal: () =>
      setState({
        calOpen: !state.calOpen,
        calM: state.calM == null ? now.getMonth() : state.calM,
        calY: state.calY == null ? now.getFullYear() : state.calY,
      }),
    calTitle: MONTHS_LONG[calMonth] + " " + calYear,
    calDays: getMiniCalDays(calMonth, calYear, state.addDay, pickDay, 0),
    days: Array.from({ length: 8 }, (_, offset) => {
      const info = dayInfo(offset);
      return {
        key: offset,
        dow: info.dow,
        num: info.num,
        isOn: chip(state.addDay, offset),
        pick: () => pickDay(offset),
      };
    }),
    times: slots.map((time) => ({
      key: time,
      label: time,
      isOn: chip(state.addTime, time),
      pick: () =>
        setState({ addTime: time, addCustom: false, addOverlapOk: false }),
    })),
    isNoSlots: state.addDay != null && slots.length === 0,
    noSlotsText: getWorkingHours(state, state.addDay || 0).on
      ? "No free 30-minute starts left this day. Use a custom time if you want to squeeze it in."
      : "You’re closed this day. Use a custom time to book it anyway.",
    isCustom,
    toggleCustom: () =>
      setState({
        addCustom: !isCustom,
        addTime: isCustom
          ? null
          : SLOT_TIMES.includes(state.addTime ?? "")
            ? null
            : state.addTime,
      }),
    customTime,
    onCustomTime: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addTime: event.target.value || null, addOverlapOk: false }),
    customMin: hours.on ? hours.s : "00:00",
    customMax: hours.on ? hours.e : "23:59",
    customHint: !hours.on
      ? "You’re closed this day. You can still book it."
      : isOutside
        ? "Outside your hours (" +
          hours.s +
          "–" +
          hours.e +
          "). You can still book it."
        : "Any time between " + hours.s + " and " + hours.e,
    isCustomWarn: isOutside || !hours.on,
    hasConflict: conflicts.length > 0,
    conflictBody:
      conflicts.map(({ name, range }) => name + ", " + range).join(" · ") +
      ". Tick below if you want to double up.",
    isOverlapOk: state.addOverlapOk,
    toggleOverlap: () => setState({ addOverlapOk: !state.addOverlapOk }),
    summary:
      client && service && state.addDay != null && state.addTime
        ? client.name +
          " · " +
          service.name +
          " · " +
          dayInfo(state.addDay).label +
          ", " +
          timeRange(state.addTime, minToDur(duration)) +
          " · £" +
          priceLabel
        : "Pick a day and time to see the summary.",
    // step 4
    ...protection,
    firstName,
    // step 5
    isAddrAsked: !!state.profile.mobile && !!client && !client.addr,
    addrValue: state.addAddr,
    onAddr: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ addAddr: event.target.value }),
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
