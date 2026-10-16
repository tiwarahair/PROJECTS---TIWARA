import type { ChangeEvent } from "react";
import type { AddonEditDraft } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../add/types";

/** The per-booking add-on dialog's values. */
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
