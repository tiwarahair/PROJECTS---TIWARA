import type { ChangeEvent } from "react";
import { parseNumber } from "../../core/format";
import type { EditContext, ServiceEditDraft } from "./context";

const EXTRA_OPTIONS = Array.from({ length: 12 }, (_slot, index) => {
  const minutes = (index + 1) * 5;

  return { value: String(minutes), label: `${minutes} min`, key: minutes };
});

const getPriceDifference = ({ price, originalPrice }: ServiceEditDraft) => {
  const difference =
    parseNumber(price) -
    parseNumber(originalPrice != null ? originalPrice : price);

  if (!difference) return "";

  return (
    (difference < 0 ? "Lowered by £" : "Raised by £") +
    Math.abs(Math.round(difference * 100) / 100)
  );
};

export const getPriceView = ({ draft, patchServiceEdit }: EditContext) => ({
  price: draft.price,
  onPrice: (event: ChangeEvent<HTMLInputElement>) =>
    patchServiceEdit({ price: event.target.value }),
  isPriceOpen: !!draft.priceOpen,
  openPrice: () => patchServiceEdit({ priceOpen: true }),
  priceReason: draft.priceReason || "",
  onPriceReason: (event: ChangeEvent<HTMLInputElement>) =>
    patchServiceEdit({ priceReason: event.target.value }),
  priceDifference: getPriceDifference(draft),
  hasExtra: draft.extra != null,
  extra: String(draft.extra || 15),
  extraOptions: EXTRA_OPTIONS,
  addExtra: () => patchServiceEdit({ extra: 15 }),
  clearExtra: () => patchServiceEdit({ extra: null }),
  onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
    patchServiceEdit({ extra: Number(event.target.value) }),
});
