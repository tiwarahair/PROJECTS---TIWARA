import type { MouseEvent } from "react";
import { getAddonPicker } from "../../services/addon-picker";
import { ICONS } from "../../core/constants";
import { parseNumber } from "../../core/format";
import type { AddonEditDraft, StudioAddon } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import { getAddonMinutes, getAddonValue } from "./addon-values";
import type { AddContext } from "./context";
import type { AddonValue } from "./types";

const getRowAnchor = (event: MouseEvent) => {
  const target = event.currentTarget as Element;
  const host = target.closest?.("[data-aorow]") ?? target;
  const rect = host.getBoundingClientRect?.();

  return rect
    ? {
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      }
    : null;
};

// ---- step 2: this booking's add-ons ----
export const getAddonsView = ({
  studio,
  state,
  setState,
  actions,
  memo,
  service,
  duration,
  price,
  selected,
  selectedAddons,
  overrides,
}: AddContext) => {
  const getTotals = (from: AddonValue, to: AddonValue) => ({
    addPrice: String(
      Math.max(0, price - from.price * from.quantity + to.price * to.quantity),
    ),
    addDuration: Math.max(
      5,
      duration - from.minutes * from.quantity + to.minutes * to.quantity,
    ),
  });

  const removeAddon = (addon: StudioAddon) => {
    const next = { ...overrides };

    delete next[addon.id];

    setState({
      addonEdit: null,
      addAddonOverrides: next,
      addAddons: selected.filter((id) => id !== addon.id),
      ...getTotals(getAddonValue(addon, overrides), {
        price: 0,
        minutes: 0,
        quantity: 0,
      }),
    });
  };

  const saveAddon = (draft: AddonEditDraft) => {
    const addon = state.addons.find(({ id }) => id === draft.id);

    if (!addon) return;

    const next = {
      price: parseNumber(draft.price),
      minutes:
        (parseInt(draft.hours) || 0) * 60 + (parseInt(draft.minutes) || 0),
      quantity: parseInt(draft.quantity) || 1,
    };

    setState({
      addonEdit: null,
      addAddonOverrides: { ...overrides, [addon.id]: next },
      ...getTotals(getAddonValue(addon, overrides), next),
    });
  };

  memo.saveAddonEdit = saveAddon;

  memo.removeAddonEdit = (id) => {
    const addon = state.addons.find((item) => item.id === id);

    if (addon) removeAddon(addon);
  };

  const addonRows = selectedAddons.map((addon) => {
    const value = getAddonValue(addon, overrides);
    const addonTotal = value.price * value.quantity;
    const quantityNote = value.quantity > 1 ? ` · ×${value.quantity}` : "";

    const timeNote = value.minutes
      ? ` · ${formatDuration(value.minutes * value.quantity)}`
      : " · no extra time";

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

    return {
      key: addon.id,
      name: addon.name + (value.quantity > 1 ? ` ×${value.quantity}` : ""),
      meta: `+£${addonTotal}${timeNote}`,
      edit: openEdit,
      menu: (event: MouseEvent) => {
        const anchor = getRowAnchor(event);

        event.stopPropagation();

        actions.openActionSheet({
          title: addon.name,
          subtitle: `+£${addonTotal}${quantityNote}`,
          anchor,
          items: [
            { label: "Edit", icon: ICONS.edit, run: () => openEdit() },
            {
              label: "Remove",
              icon: ICONS.trash,
              danger: true,
              run: () => removeAddon(addon),
            },
          ],
        });
      },
    };
  });

  return {
    isAddonPick: state.addStep === 2 && !!state.addAddonPickerOpen,
    addonRows,
    openAddons: () =>
      setState({
        addAddonPickerOpen: true,
        addAddonQuery: "",
        addAddonCategory: null,
      }),
    picker:
      state.sheet === "add" && state.addAddonPickerOpen
        ? getAddonPicker(
            studio,
            state,
            selected,
            (addon) =>
              setState({
                addAddons: selected.concat([addon.id]),
                addPrice: String(Math.max(0, price + parseNumber(addon.price))),
                addDuration: Math.max(5, duration + getAddonMinutes(addon)),
              }),
            service?.categoryId,
            (addon) => memo.removeAddonEdit?.(addon.id),
          )
        : null,
    addonDialog: (draft: AddonEditDraft) => ({
      remove: () => memo.removeAddonEdit?.(draft.id ?? ""),
      save: () => memo.saveAddonEdit?.(draft),
    }),
  };
};
