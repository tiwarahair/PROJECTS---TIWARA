// The booking's "Edit service" step and its sub-steps (prototype editSvcVals, esaBuild): time, duration, extra time,
// price, add-ons, change service, add an add-on and the add-on edit dialog.
import type { ChangeEvent, MouseEvent } from "react";
import { getAddonPicker } from "./addon-picker";
import type { DecoratedBooking } from "./studio-decorate";
import { ICONS, TAXONOMY } from "./studio-data";
import {
  hhmm,
  minutesToDuration,
  parseNumber,
  timeToMinutes,
} from "./studio-format";
import { getBusy, getWorkingHours } from "./studio-model";
import type {
  AddonEditDraft,
  BookingAddon,
  StudioBooking,
} from "./studio-types";
import type { StudioController } from "./use-studio";

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

/** The per-booking add-on dialog's values (prototype esaBuild). */
export const getAddonDialog = (
  studio: StudioController,
  draft: AddonEditDraft,
) => {
  const { setState } = studio;
  const quantity = parseInt(draft.quantity) || 1;

  const update = (patch: Partial<AddonEditDraft>) =>
    setState({ addonEdit: { ...draft, ...patch } });

  return {
    name: draft.name,
    price: draft.price,
    hours: draft.hours || "0",
    minutes: draft.minutes || "0",
    quantity: draft.quantity || "1",
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    isMinQuantity: quantity <= 1,
    quantityDown: () => update({ quantity: String(Math.max(1, quantity - 1)) }),
    quantityUp: () => update({ quantity: String(Math.min(20, quantity + 1)) }),
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      update({ price: event.target.value }),
    onHours: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ hours: event.target.value }),
    onMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      update({ minutes: event.target.value }),
    onQuantity: (event: ChangeEvent<HTMLInputElement>) =>
      update({
        quantity: String(
          Math.max(1, Math.min(20, parseInt(event.target.value) || 1)),
        ),
      }),
    close: () => setState({ addonEdit: null }),
  };
};

export const getEditServiceView = (
  studio: StudioController,
  booking: DecoratedBooking,
  patchBooking: (patch: Partial<StudioBooking>) => void,
) => {
  const { state, setState, actions, serviceActions, context } = studio;

  const draft = state.serviceEdit ?? {
    serviceId: null,
    serviceName: "",
    taxonomyId: null,
    time: 0,
    duration: 0,
    price: "",
    originalPrice: "",
    priceOpen: false,
    priceReason: "",
    extra: null,
    addons: [],
  };

  const { patchServiceEdit } = serviceActions;

  const getService = (id: string | null) =>
    state.services.find((service) => service.id === id) ?? null;

  const getAddon = (id: string | undefined) =>
    state.addons.find((addon) => addon.id === id) ?? null;

  const hours = getWorkingHours(state, booking.dayOffset);
  const open = hours.on ? timeToMinutes(hours.start) : 9 * 60;
  const close = hours.on ? timeToMinutes(hours.end) : 18 * 60;
  const duration = draft.duration || booking.durationMinutes;
  const extra = draft.extra || 0;
  const span = duration + extra;
  const busy = getBusy(state, booking.dayOffset, booking.id);

  const isFree = (start: number) =>
    start >= open &&
    start + span <= close &&
    !busy.some(
      ({ startMinutes, endMinutes }) =>
        startMinutes < start + span && endMinutes > start,
    );

  const timeOptions: { key: number; value: string; label: string }[] = [];

  for (let start = open; start + span <= close; start += 5)
    timeOptions.push({ value: String(start), label: hhmm(start), key: start });

  if (draft.time != null && !timeOptions.some(({ key }) => key === draft.time))
    timeOptions.push({
      value: String(draft.time),
      label: hhmm(draft.time),
      key: draft.time,
    });

  timeOptions.sort((first, second) => first.key - second.key);

  const clashes =
    draft.time != null
      ? busy.filter(
          ({ startMinutes, endMinutes }) =>
            startMinutes < draft.time + span && endMinutes > draft.time,
        )
      : [];

  const firstClash = clashes[0];

  const getClashText = () => {
    if (!firstClash) return "";

    const clashTime = hhmm(draft.time);

    // the prototype shows the clashing booking's client id here, not the name
    const clashWho =
      firstClash.kind === "booking"
        ? ` · ${firstClash.booking?.client}`
        : ` · ${firstClash.block?.reason || "blocked"}`;

    return `Not available at ${clashTime}${clashWho}`;
  };

  const clashText = getClashText();
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
        pick: () => patchServiceEdit({ time: value }),
      });
    }

  const extraOptions: { key: number; value: string; label: string }[] = [];

  for (let minutes = 5; minutes <= 60; minutes += 5)
    extraOptions.push({
      value: String(minutes),
      label: `${minutes} min`,
      key: minutes,
    });

  const getAddonValues = (link: BookingAddon) => {
    const addon = getAddon(link.addonId) ?? {
      name: link.name || "Add-on",
      price: 0,
      hours: 0,
      min: 0,
    };

    const price = link.price != null ? link.price : parseNumber(addon.price);

    const minutes =
      link.minutes != null
        ? link.minutes
        : (parseInt(String(addon.hours)) || 0) * 60 +
          (parseInt(String(addon.min)) || 0);

    return { addon, price, minutes, quantity: link.quantity || 1 };
  };

  const addonRows = draft.addons.map((link, index) => {
    const { addon, price, minutes, quantity } = getAddonValues(link);

    const openEdit = () =>
      setState({
        addonEdit: {
          index,
          name: addon.name,
          price: String(price),
          hours: String(Math.floor(minutes / 60)),
          minutes: String(minutes % 60),
          quantity: String(quantity),
        },
      });

    const addonTotal = price * quantity;

    const timeNote = minutes
      ? ` · ${minutesToDuration(minutes * quantity)}`
      : " · no extra time";

    return {
      key: (link.addonId ?? "") + index,
      name: addon.name + (quantity > 1 ? ` ×${quantity}` : ""),
      meta: `+£${addonTotal}${timeNote}`,
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

        actions.openActionSheet({
          title: addon.name,
          subtitle: `+£${price * quantity}${quantity > 1 ? ` · ×${quantity}` : ""}`,
          anchor,
          items: [
            { label: "Edit", iconPath: ICONS.edit, run: openEdit },
            {
              label: "Remove",
              iconPath: ICONS.trash,
              danger: true,
              run: () =>
                patchServiceEdit({
                  addons: draft.addons.filter(
                    (_item, other) => other !== index,
                  ),
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

  const query = (state.changeServiceQuery || "").toLowerCase();

  const serviceGroups: {
    key: string;
    category: string;
    count: string;
    items: {
      key: string;
      name: string;
      duration: string;
      price: string;
      isOn: boolean;
      pick: () => void;
    }[];
  }[] = [];

  TAXONOMY.forEach((group) => {
    const items = state.services
      .filter(
        (service) =>
          service.taxonomyId === group.id &&
          (service.status || "active") !== "archived" &&
          (!query || service.name.toLowerCase().includes(query)),
      )
      .map((service) => {
        const isOn = service.id === draft.serviceId;

        return {
          key: service.id,
          name: service.name,
          duration: service.duration,
          price: `£${service.price}`,
          isOn,
          pick: () => {
            if (isOn) {
              setState({ bookingStep: "editsvc" });

              return;
            }

            setState({
              bookingStep: "editsvc",
              serviceEdit: {
                ...draft,
                serviceId: service.id,
                serviceName: service.name,
                taxonomyId: service.taxonomyId,
                duration:
                  (service.durationHours || 0) * 60 +
                  (service.durationMinutes || 0),
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
        category: group.name,
        count: String(items.length),
        items,
      });
  });

  const addonDraft = state.addonEdit;

  const apply = () => {
    if (clashes.length && !context.memo.clashOk && firstClash) {
      const who =
        firstClash.kind === "booking" && firstClash.booking
          ? `${firstClash.booking.client}'s ${firstClash.booking.service}`
          : firstClash.block?.reason || "blocked time";

      const clashTime = hhmm(draft.time);

      setState({
        confirm: {
          title: "Double-book this slot?",
          yesLabel: "Apply anyway",
          noLabel: "Pick another time",
          body: `${clashTime} overlaps ${who}. Both stay in your calendar and the slot will not reopen for online booking.`,
          yes: () => {
            context.memo.clashOk = true;
            setState({ confirm: null });
            context.memo.applyEdit?.();
            context.memo.clashOk = false;
          },
        },
      });

      return;
    }

    patchBooking({
      price: parseNumber(draft.price) + addonsPrice,
      duration: minutesToDuration(duration),
      time: hhmm(draft.time),
      priceReason: (draft.priceReason || "").trim(),
    });

    const list = state.bookings.map((item) =>
      item.id === booking.id
        ? { ...item, service: draft.serviceName, addons: draft.addons.slice() }
        : item,
    );

    setState({ bookingStepOut: true });

    window.setTimeout(() => {
      setState(({ bookings }) => ({
        // the patch above already landed; keep its price / time and take the new service and add-ons
        bookings: bookings.map((item) => {
          const next = list.find(({ id }) => id === item.id);

          return next && item.id === booking.id
            ? { ...item, service: next.service, addons: next.addons }
            : item;
        }),
        bookingStep: "view",
        bookingStepOut: false,
        bookingStepBack: true,
      }));

      actions.showToast(`Service updated. ${booking.firstName} is notified`);
      window.setTimeout(() => setState({ bookingStepBack: false }), 700);
    }, 200);
  };

  context.memo.applyEdit = apply;

  const priceDifference = (() => {
    const difference =
      parseNumber(draft.price) -
      parseNumber(
        draft.originalPrice != null ? draft.originalPrice : draft.price,
      );

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
      const addon = getAddon(link.addonId) ?? {
        name: "Add-on",
        price: 0,
        hours: 0,
        min: 0,
      };

      const price = link.price != null ? link.price : parseNumber(addon.price);

      const minutes =
        link.minutes != null
          ? link.minutes
          : (parseInt(String(addon.hours)) || 0) * 60 +
            (parseInt(String(addon.min)) || 0);

      return {
        key: (link.addonId ?? "") + index,
        name: addon.name || "Add-on",
        meta: `+£${price}${minutes ? ` · ${minutesToDuration(minutes)}` : ""}`,
      };
    }),
    // edit step
    categoryLabel: categoryName(draft.taxonomyId),
    serviceName: draft.serviceName || booking.service,
    serviceMeta: `${minutesToDuration(duration)} · £${parseNumber(draft.price)}`,
    openChange: () => {
      const old = getService(draft.serviceId);
      const changed: string[] = [];

      if (old) {
        if (parseNumber(draft.price) !== parseNumber(old.price))
          changed.push("price");

        if (
          (draft.duration || 0) !==
          (old.durationHours || 0) * 60 + (old.durationMinutes || 0)
        )
          changed.push("duration");

        if ((draft.extra || 0) !== (old.extra ? Number(old.extra) : 0))
          changed.push("extra time");
      }

      if (draft.addons.length)
        changed.push(
          draft.addons.length === 1
            ? "1 add-on"
            : `${draft.addons.length} add-ons`,
        );

      const openChangeService = () =>
        setState({
          confirm: null,
          bookingStep: "changesvc",
          changeServiceQuery: "",
        });

      if (!changed.length) {
        openChangeService();

        return;
      }

      const changedList = changed.join(", ");

      setState({
        confirm: {
          title: "Change the service?",
          yesLabel: "Change service",
          noLabel: "Keep editing",
          body: `Picking a different service resets the ${changedList} you set here to the new service’s defaults. The start time stays as it is.`,
          yes: openChangeService,
        },
      });
    },
    time: String(draft.time),
    timeOptions,
    onTime: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({ time: Number(event.target.value) }),
    hasClash: clashes.length > 0,
    clashText,
    nextFree,
    durationHours: String(Math.floor(duration / 60)),
    durationMinutes: String(duration % 60),
    hourOptions: HOUR_OPTIONS,
    minuteOptions: MINUTE_OPTIONS,
    onDurationHours: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({
        duration: Math.max(
          5,
          Number(event.target.value) * 60 + (duration % 60),
        ),
      }),
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({
        duration: Math.max(
          5,
          Math.floor(duration / 60) * 60 + Number(event.target.value),
        ),
      }),
    price: draft.price,
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      patchServiceEdit({ price: event.target.value }),
    isPriceOpen: !!draft.priceOpen,
    openPrice: () => patchServiceEdit({ priceOpen: true }),
    priceReason: draft.priceReason || "",
    onPriceReason: (event: ChangeEvent<HTMLInputElement>) =>
      patchServiceEdit({ priceReason: event.target.value }),
    priceDifference,
    hasExtra: draft.extra != null,
    extra: String(draft.extra || 15),
    extraOptions,
    addExtra: () => patchServiceEdit({ extra: 15 }),
    clearExtra: () => patchServiceEdit({ extra: null }),
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      patchServiceEdit({ extra: Number(event.target.value) }),
    addonRows,
    openAddAddon: () =>
      setState({
        bookingStep: "addaddon",
        addAddonQuery: "",
        addAddonCategory: null,
      }),
    totalLabel: `${minutesToDuration(totalMinutes)}  £${totalPrice}`,
    apply,
    // add an add-on
    picker: getAddonPicker(
      studio,
      state,
      draft.addons.map(({ addonId }) => addonId ?? ""),
      (addon) =>
        setState({
          serviceEdit: {
            ...draft,
            addons: draft.addons.concat([
              {
                addonId: addon.id,
                price: parseNumber(addon.price),
                minutes:
                  (parseInt(String(addon.hours)) || 0) * 60 +
                  (parseInt(String(addon.min)) || 0),
                quantity: 1,
              },
            ]),
          },
        }),
      (state.services.find(({ id }) => id === draft.serviceId) ?? null)
        ?.categoryId,
      (addon) =>
        setState({
          serviceEdit: {
            ...draft,
            addons: draft.addons.filter(({ addonId }) => addonId !== addon.id),
          },
        }),
      () => setState({ bookingStep: "editsvc" }),
    ),
    // change service
    serviceQuery: state.changeServiceQuery || "",
    onServiceQuery: (event: ChangeEvent<HTMLInputElement>) =>
      setState({ changeServiceQuery: event.target.value }),
    serviceGroups,
    // the add-on edit dialog
    addonDialog:
      addonDraft && addonDraft.context !== "add"
        ? {
            ...getAddonDialog(studio, addonDraft),
            remove: () =>
              setState({
                addonEdit: null,
                serviceEdit: {
                  ...draft,
                  addons: draft.addons.filter(
                    (_item, index) => index !== addonDraft.index,
                  ),
                },
              }),
            save: () => {
              const list = draft.addons.map((link, index) =>
                index === addonDraft.index
                  ? {
                      ...link,
                      price: parseNumber(addonDraft.price),
                      minutes:
                        (parseInt(addonDraft.hours) || 0) * 60 +
                        (parseInt(addonDraft.minutes) || 0),
                      quantity: parseInt(addonDraft.quantity) || 1,
                    }
                  : link,
              );

              setState({
                addonEdit: null,
                serviceEdit: { ...draft, addons: list },
              });
            },
          }
        : null,
  };
};

export type EditServiceView = ReturnType<typeof getEditServiceView>;
