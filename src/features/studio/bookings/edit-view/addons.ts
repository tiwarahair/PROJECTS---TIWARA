import type { MouseEvent } from "react";
import { getAddonPicker } from "../../services/addon-picker";
import { ICONS } from "../../core/constants";
import { parseNumber } from "../../core/format";
import { formatDuration } from "../../../../utils/dates";
import { getAddonDialog } from "./addon-dialog";
import { getAddonMinutes } from "./context";
import type { EditContext } from "./context";
import { formatMoney } from "../../../../utils/money";

const getMenuAnchor = (event: MouseEvent) => {
  const host =
    (event.currentTarget as Element).closest?.("[data-aorow]") ??
    (event.currentTarget as Element);

  const rect = host.getBoundingClientRect?.();

  return rect
    ? {
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      }
    : null;
};

export const getServiceCardView = ({
  state,
  booking,
  getLinkValues,
}: EditContext) => ({
  bookingAddons: (
    state.bookings.find(({ id }) => id === booking.id)?.addons || []
  ).map((link, index) => {
    const { addon, price, minutes } = getLinkValues(link, "Add-on");

    return {
      key: (link.addonId ?? "") + index,
      name: addon.name || "Add-on",
      meta: `+${formatMoney(price)}${minutes ? ` · ${formatDuration(minutes)}` : ""}`,
    };
  }),
});

export const getAddonRowsView = ({
  setState,
  actions,
  draft,
  getLinkValues,
  patchServiceEdit,
}: EditContext) => ({
  addonRows: draft.addons.map((link, index) => {
    const { addon, price, minutes, quantity } = getLinkValues(
      link,
      link.name || "Add-on",
    );

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

    const timeNote = minutes
      ? ` · ${formatDuration(minutes * quantity)}`
      : " · no extra time";

    return {
      key: (link.addonId ?? "") + index,
      name: addon.name + (quantity > 1 ? ` ×${quantity}` : ""),
      meta: `+${formatMoney(price * quantity)}${timeNote}`,
      edit: (event?: MouseEvent) => {
        event?.stopPropagation();
        openEdit();
      },
      menu: (event: MouseEvent) => {
        const anchor = getMenuAnchor(event);

        event.stopPropagation();

        actions.openActionSheet({
          title: addon.name,
          subtitle: `+${formatMoney(price * quantity)}${quantity > 1 ? ` · ×${quantity}` : ""}`,
          anchor,
          items: [
            { label: "Edit", icon: ICONS.edit, run: openEdit },
            {
              label: "Remove",
              icon: ICONS.trash,
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
  }),
  openAddAddon: () =>
    setState({
      bookingStep: "addaddon",
      addAddonQuery: "",
      addAddonCategory: null,
    }),
});

export const getPickerView = ({
  studio,
  state,
  setState,
  draft,
}: EditContext) => ({
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
              minutes: getAddonMinutes(addon),
              quantity: 1,
            },
          ]),
        },
      }),
    state.services.find(({ id }) => id === draft.serviceId)?.categoryId,
    (addon) =>
      setState({
        serviceEdit: {
          ...draft,
          addons: draft.addons.filter(({ addonId }) => addonId !== addon.id),
        },
      }),
    () => setState({ bookingStep: "editsvc" }),
  ),
});

export const getAddonDialogView = ({
  studio,
  state,
  setState,
  draft,
}: EditContext) => {
  const addonDraft = state.addonEdit;

  return {
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
                      minutes: getAddonMinutes({
                        hours: addonDraft.hours,
                        min: addonDraft.minutes,
                      }),
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
