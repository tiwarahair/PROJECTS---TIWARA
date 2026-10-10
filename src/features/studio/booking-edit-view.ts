// The booking's "Edit service" step and its sub-steps (prototype editSvcVals, esaBuild): time, duration, extra time,
// price, add-ons, change service, add an add-on and the add-on edit dialog.
import type { ChangeEvent, MouseEvent } from "react";
import { getAddonPicker } from "./addon-picker";
import type { DecoratedBooking } from "./studio-decorate";
import { ICONS, TAXONOMY } from "./studio-data";
import { hhmm, minToDur, parseNumber, toMin } from "./studio-format";
import { getBusy, getWorkingHours } from "./studio-model";
import type {
  AddonEditDraft,
  BookingAddon,
  StudioBooking,
} from "./studio-types";
import type { StudioController } from "./use-studio";

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

/** The per-booking add-on dialog's values (prototype esaBuild). */
export const getAddonDialog = (
  studio: StudioController,
  draft: AddonEditDraft,
) => {
  const { setState } = studio;
  const quantity = parseInt(draft.qty) || 1;
  const update = (patch: Partial<AddonEditDraft>) =>
    setState({ esAddon: { ...draft, ...patch } });
  return {
    name: draft.name,
    price: draft.price,
    hrs: draft.hrs || "0",
    mins: draft.mins || "0",
    qty: draft.qty || "1",
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    isMinQty: quantity <= 1,
    qtyDown: () => update({ qty: String(Math.max(1, quantity - 1)) }),
    qtyUp: () => update({ qty: String(Math.min(20, quantity + 1)) }),
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      update({ price: event.target.value }),
    onHrs: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ hrs: event.target.value }),
    onMins: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ mins: event.target.value }),
    onQty: (event: ChangeEvent<HTMLInputElement>) =>
      update({
        qty: String(
          Math.max(1, Math.min(20, parseInt(event.target.value) || 1)),
        ),
      }),
    close: () => setState({ esAddon: null }),
  };
};

export const getEditServiceView = (
  studio: StudioController,
  booking: DecoratedBooking,
  patchBooking: (patch: Partial<StudioBooking>) => void,
) => {
  const { state, setState, actions, serviceActions, context } = studio;
  const draft = state.es ?? {
    svcId: null,
    svcName: "",
    cat: null,
    time: 0,
    dur: 0,
    price: "",
    price0: "",
    priceOpen: false,
    priceReason: "",
    extra: null,
    addons: [],
  };
  const { esPatch } = serviceActions;
  const getService = (id: string | null) =>
    state.services.find((service) => service.id === id) ?? null;
  const getAddon = (id: string | undefined) =>
    state.addons.find((addon) => addon.id === id) ?? null;
  const hours = getWorkingHours(state, booking.off);
  const open = hours.on ? toMin(hours.s) : 9 * 60;
  const close = hours.on ? toMin(hours.e) : 18 * 60;
  const duration = draft.dur || booking.durMin;
  const extra = draft.extra || 0;
  const span = duration + extra;
  const busy = getBusy(state, booking.off, booking.id);
  const isFree = (start: number) =>
    start >= open &&
    start + span <= close &&
    !busy.some(({ s, e }) => s < start + span && e > start);
  const timeOptions: { key: number; v: string; label: string }[] = [];
  for (let start = open; start + span <= close; start += 5)
    timeOptions.push({ v: String(start), label: hhmm(start), key: start });
  if (draft.time != null && !timeOptions.some(({ key }) => key === draft.time))
    timeOptions.push({
      v: String(draft.time),
      label: hhmm(draft.time),
      key: draft.time,
    });
  timeOptions.sort((first, second) => first.key - second.key);
  const clashes =
    draft.time != null
      ? busy.filter(({ s, e }) => s < draft.time + span && e > draft.time)
      : [];
  const firstClash = clashes[0];
  const clashText = firstClash
    ? "Not available at " +
      hhmm(draft.time) +
      // the prototype shows the clashing booking's client id here, not the name
      (firstClash.kind === "booking"
        ? " · " + firstClash.b?.client
        : " · " + (firstClash.k?.reason || "blocked"))
    : "";
  const nextFree: { key: number; label: string; pick: () => void }[] = [];
  for (
    let start = (draft.time || open) + 5;
    start + span <= close && nextFree.length < 3;
    start += 5
  )
    if (isFree(start)) {
      const value = start;
      nextFree.push({
        key: value,
        label: hhmm(value),
        pick: () => esPatch({ time: value }),
      });
    }
  const extraOptions: { key: number; v: string; label: string }[] = [];
  for (let minutes = 5; minutes <= 60; minutes += 5)
    extraOptions.push({
      v: String(minutes),
      label: minutes + " min",
      key: minutes,
    });
  const getAddonValues = (link: BookingAddon) => {
    const addon = getAddon(link.aid) ?? {
      name: link.name || "Add-on",
      price: 0,
      hr: 0,
      min: 0,
    };
    const price = link.price != null ? link.price : parseNumber(addon.price);
    const minutes =
      link.mins != null
        ? link.mins
        : (parseInt(String(addon.hr)) || 0) * 60 +
          (parseInt(String(addon.min)) || 0);
    return { addon, price, minutes, quantity: link.qty || 1 };
  };
  const addonRows = draft.addons.map((link, index) => {
    const { addon, price, minutes, quantity } = getAddonValues(link);
    const openEdit = () =>
      setState({
        esAddon: {
          idx: index,
          name: addon.name,
          price: String(price),
          hrs: String(Math.floor(minutes / 60)),
          mins: String(minutes % 60),
          qty: String(quantity),
        },
      });
    return {
      key: (link.aid ?? "") + index,
      name: addon.name + (quantity > 1 ? " ×" + quantity : ""),
      meta:
        "+£" +
        price * quantity +
        (minutes ? " · " + minToDur(minutes * quantity) : " · no extra time"),
      edit: (event?: MouseEvent) => {
        event?.stopPropagation();
        openEdit();
      },
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
            "+£" + price * quantity + (quantity > 1 ? " · ×" + quantity : ""),
          anchor,
          items: [
            { label: "Edit", d: ICONS.edit, run: openEdit },
            {
              label: "Remove",
              d: ICONS.trash,
              danger: true,
              run: () =>
                esPatch({
                  addons: draft.addons.filter((_, other) => other !== index),
                }),
            },
          ],
        });
      },
    };
  });
  let addonsPrice = 0;
  let addonsMinutes = 0;
  for (const link of draft.addons) {
    const { price, minutes, quantity } = getAddonValues(link);
    addonsPrice += price * quantity;
    addonsMinutes += minutes * quantity;
  }
  const totalPrice = parseNumber(draft.price) + addonsPrice;
  const totalMinutes = duration + extra + addonsMinutes;
  const categoryName = (id: string | null) =>
    TAXONOMY.find((group) => group.id === id)?.name ?? "Other";
  const query = (state.csQ || "").toLowerCase();
  const serviceGroups: {
    key: string;
    cat: string;
    n: string;
    items: {
      key: string;
      name: string;
      dur: string;
      price: string;
      isOn: boolean;
      pick: () => void;
    }[];
  }[] = [];
  TAXONOMY.forEach((group) => {
    const items = state.services
      .filter(
        (service) =>
          service.cat === group.id &&
          (service.st || "active") !== "archived" &&
          (!query || service.name.toLowerCase().includes(query)),
      )
      .map((service) => {
        const isOn = service.id === draft.svcId;
        return {
          key: service.id,
          name: service.name,
          dur: service.dur,
          price: "£" + service.price,
          isOn,
          pick: () => {
            if (isOn) {
              setState({ bkStep: "editsvc" });
              return;
            }
            setState({
              bkStep: "editsvc",
              es: {
                ...draft,
                svcId: service.id,
                svcName: service.name,
                cat: service.cat,
                dur: (service.durH || 0) * 60 + (service.durM || 0),
                price: String(service.price),
                extra: service.extra ? Number(service.extra) : null,
                addons: [],
              },
            });
          },
        };
      });
    if (items.length)
      serviceGroups.push({
        key: group.id,
        cat: group.name,
        n: String(items.length),
        items,
      });
  });
  const addonDraft = state.esAddon;

  const apply = () => {
    if (clashes.length && !context.memo.clashOk && firstClash) {
      const who =
        firstClash.kind === "booking" && firstClash.b
          ? firstClash.b.client + "'s " + firstClash.b.svc
          : firstClash.k?.reason || "blocked time";
      setState({
        confirm: {
          title: "Double-book this slot?",
          yesLabel: "Apply anyway",
          noLabel: "Pick another time",
          body:
            hhmm(draft.time) +
            " overlaps " +
            who +
            ". Both stay in your calendar and the slot will not reopen for online booking.",
          yes: () => {
            context.memo.clashOk = true;
            setState({ confirm: null });
            context.memo.applyFn?.();
            context.memo.clashOk = false;
          },
        },
      });
      return;
    }
    patchBooking({
      price: parseNumber(draft.price) + addonsPrice,
      dur: minToDur(duration),
      time: hhmm(draft.time),
      priceReason: (draft.priceReason || "").trim(),
    });
    const list = state.bookings.map((item) =>
      item.id === booking.id
        ? { ...item, svc: draft.svcName, addons: draft.addons.slice() }
        : item,
    );
    setState({ bkOut: true });
    window.setTimeout(() => {
      setState(({ bookings }) => ({
        // the patch above already landed; keep its price / time and take the new service and add-ons
        bookings: bookings.map((item) => {
          const next = list.find(({ id }) => id === item.id);
          return next && item.id === booking.id
            ? { ...item, svc: next.svc, addons: next.addons }
            : item;
        }),
        bkStep: "view",
        bkOut: false,
        bkBack: true,
      }));
      actions.toastMsg(
        "Service updated. " + booking.firstName + " is notified",
      );
      window.setTimeout(() => setState({ bkBack: false }), 700);
    }, 200);
  };
  context.memo.applyFn = apply;

  const priceDifference = (() => {
    const difference =
      parseNumber(draft.price) -
      parseNumber(draft.price0 != null ? draft.price0 : draft.price);
    return difference
      ? (difference < 0 ? "Lowered by £" : "Raised by £") +
          Math.abs(Math.round(difference * 100) / 100)
      : "";
  })();

  return {
    // view-step service card
    bookingAddons: (
      state.bookings.find(({ id }) => id === booking.id)?.addons || []
    ).map((link, index) => {
      const addon = getAddon(link.aid) ?? {
        name: "Add-on",
        price: 0,
        hr: 0,
        min: 0,
      };
      const price = link.price != null ? link.price : parseNumber(addon.price);
      const minutes =
        link.mins != null
          ? link.mins
          : (parseInt(String(addon.hr)) || 0) * 60 +
            (parseInt(String(addon.min)) || 0);
      return {
        key: (link.aid ?? "") + index,
        name: addon.name || "Add-on",
        meta: "+£" + price + (minutes ? " · " + minToDur(minutes) : ""),
      };
    }),
    // edit step
    catLabel: categoryName(draft.cat),
    svcName: draft.svcName || booking.svc,
    svcMeta: minToDur(duration) + " · £" + parseNumber(draft.price),
    openChange: () => {
      const old = getService(draft.svcId);
      const changed: string[] = [];
      if (old) {
        if (parseNumber(draft.price) !== parseNumber(old.price))
          changed.push("price");
        if ((draft.dur || 0) !== (old.durH || 0) * 60 + (old.durM || 0))
          changed.push("duration");
        if ((draft.extra || 0) !== (old.extra ? Number(old.extra) : 0))
          changed.push("extra time");
      }
      if (draft.addons.length)
        changed.push(
          draft.addons.length === 1
            ? "1 add-on"
            : draft.addons.length + " add-ons",
        );
      const go = () =>
        setState({ confirm: null, bkStep: "changesvc", csQ: "" });
      if (!changed.length) {
        go();
        return;
      }
      setState({
        confirm: {
          title: "Change the service?",
          yesLabel: "Change service",
          noLabel: "Keep editing",
          body:
            "Picking a different service resets the " +
            changed.join(", ") +
            " you set here to the new service’s defaults. The start time stays as it is.",
          yes: go,
        },
      });
    },
    time: String(draft.time),
    timeOptions,
    onTime: (event: ChangeEvent<HTMLSelectElement>) =>
      esPatch({ time: Number(event.target.value) }),
    hasClash: clashes.length > 0,
    clashText,
    nextFree,
    durH: String(Math.floor(duration / 60)),
    durM: String(duration % 60),
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    onDurH: (event: ChangeEvent<HTMLSelectElement>) =>
      esPatch({
        dur: Math.max(5, Number(event.target.value) * 60 + (duration % 60)),
      }),
    onDurM: (event: ChangeEvent<HTMLSelectElement>) =>
      esPatch({
        dur: Math.max(
          5,
          Math.floor(duration / 60) * 60 + Number(event.target.value),
        ),
      }),
    price: draft.price,
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      esPatch({ price: event.target.value }),
    isPriceOpen: !!draft.priceOpen,
    openPrice: () => esPatch({ priceOpen: true }),
    priceReason: draft.priceReason || "",
    onPriceReason: (event: ChangeEvent<HTMLInputElement>) =>
      esPatch({ priceReason: event.target.value }),
    priceDifference,
    hasExtra: draft.extra != null,
    extra: String(draft.extra || 15),
    extraOptions,
    addExtra: () => esPatch({ extra: 15 }),
    clearExtra: () => esPatch({ extra: null }),
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      esPatch({ extra: Number(event.target.value) }),
    addonRows,
    openAddAddon: () => setState({ bkStep: "addaddon", aaQ: "", aaCat: null }),
    totalLabel: minToDur(totalMinutes) + "  £" + totalPrice,
    apply,
    // add an add-on
    picker: getAddonPicker(
      studio,
      state,
      draft.addons.map(({ aid }) => aid ?? ""),
      (addon) =>
        setState({
          es: {
            ...draft,
            addons: draft.addons.concat([
              {
                aid: addon.id,
                price: parseNumber(addon.price),
                mins:
                  (parseInt(String(addon.hr)) || 0) * 60 +
                  (parseInt(String(addon.min)) || 0),
                qty: 1,
              },
            ]),
          },
        }),
      (state.services.find(({ id }) => id === draft.svcId) ?? null)?.categoryId,
      (addon) =>
        setState({
          es: {
            ...draft,
            addons: draft.addons.filter(({ aid }) => aid !== addon.id),
          },
        }),
      () => setState({ bkStep: "editsvc" }),
    ),
    // change service
    serviceQuery: state.csQ || "",
    onServiceQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ csQ: event.target.value }),
    serviceGroups,
    // the add-on edit dialog
    addonDialog:
      addonDraft && addonDraft.ctx !== "add"
        ? {
            ...getAddonDialog(studio, addonDraft),
            remove: () =>
              setState({
                esAddon: null,
                es: {
                  ...draft,
                  addons: draft.addons.filter(
                    (_, index) => index !== addonDraft.idx,
                  ),
                },
              }),
            save: () => {
              const list = draft.addons.map((link, index) =>
                index === addonDraft.idx
                  ? {
                      ...link,
                      price: parseNumber(addonDraft.price),
                      mins:
                        (parseInt(addonDraft.hrs) || 0) * 60 +
                        (parseInt(addonDraft.mins) || 0),
                      qty: parseInt(addonDraft.qty) || 1,
                    }
                  : link,
              );
              setState({ esAddon: null, es: { ...draft, addons: list } });
            },
          }
        : null,
  };
};

export type EditServiceView = ReturnType<typeof getEditServiceView>;
