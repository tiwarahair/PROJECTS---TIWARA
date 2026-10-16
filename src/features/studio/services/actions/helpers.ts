import { TAXONOMY } from "../../core/constants";
import type { StudioAddon, VariationRow } from "../../core/types";

export const makeVariationRows = (
  labels: string[] | null | undefined,
): VariationRow[] =>
  (labels || []).map((label) => ({
    label,
    on: false,
    priceDelta: "",
    hoursDelta: "",
    minutesDelta: "",
  }));

export const getBlankAddon = (): StudioAddon => ({
  id: "",
  categoryId: null,
  name: "",
  price: "",
  hours: "",
  min: "",
});

export const getTaxonomy = (id: string | null | undefined) =>
  TAXONOMY.find((group) => group.id === id) ?? null;

/** Anchor a menu under the element that opened it (wide layouts only). */
export const getAnchor = (
  event?: { currentTarget?: EventTarget | null } | null,
) => {
  const host = event?.currentTarget as Element | null | undefined;

  if (!host?.getBoundingClientRect) return null;

  const rect = host.getBoundingClientRect();

  return {
    top: rect.bottom + 6,
    right: Math.max(12, window.innerWidth - rect.right),
  };
};
