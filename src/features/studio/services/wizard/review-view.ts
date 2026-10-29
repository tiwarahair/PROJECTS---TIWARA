import { parseNumber } from "../../core/format";
import type { VariationRow, WizardDraft } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import { formatMoney } from "../../../../utils/money";
import { getDeltaLabel } from "../../../booking/logic/pricing";
import type { WizardBase } from "./adjust";
import type { WizardContext } from "./context";

const getDelta = (
  row: VariationRow | null,
  field: "priceDelta" | "hoursDelta" | "minutesDelta",
) => (row ? parseNumber(row[field]) : 0);

/** Base + size + length → price and time. */
const getCell = (
  base: WizardBase,
  size: VariationRow | null,
  length: VariationRow | null,
) => {
  const price =
    base.basePrice +
    getDelta(size, "priceDelta") +
    getDelta(length, "priceDelta");

  const minutes =
    (base.baseHours +
      getDelta(size, "hoursDelta") +
      getDelta(length, "hoursDelta")) *
      60 +
    base.baseMinutes +
    getDelta(size, "minutesDelta") +
    getDelta(length, "minutesDelta");

  return {
    price: formatMoney(price),
    duration: formatDuration(minutes),
  };
};

/** Every bookable combination. */
export const getReview = (draft: WizardDraft, base: WizardBase) => {
  const sizes = draft.sizesOn ? (draft.sizes || []).filter(({ on }) => on) : [];

  const lengths = draft.lengthsOn
    ? (draft.lengths || []).filter(({ on }) => on)
    : [];

  const isGrid = sizes.length > 0 && lengths.length > 0;
  const plain = getCell(base, null, null);

  return {
    sizes,
    lengths,
    ownNote:
      sizes.length || lengths.length
        ? " · adds to any of the above"
        : " · adds to the base price",
    // they add on top of whichever size / length is picked, so each shows its change
    own: (draft.own || []).map(({ name, options }) => ({
      name,
      options: options.map(({ label, priceDelta, minutesDelta }) => ({
        label,
        change:
          getDeltaLabel(
            {
              priceDelta: parseNumber(priceDelta),
              minutesDelta: parseNumber(minutesDelta),
            },
            true,
          ) || "No change",
      })),
    })),
    baseLabel: `Base price ${plain.price} · ${plain.duration}`,
    isGrid,
    corner: "Size \\ Length",
    head: lengths.map(({ label }) => label),
    rows: isGrid
      ? sizes.map((size) => ({
          label: size.label,
          cells: lengths.map((length) => getCell(base, size, length)),
        }))
      : [],
    items: (sizes.length ? sizes : lengths).map((row) => {
      const cell = sizes.length
        ? getCell(base, row, null)
        : getCell(base, null, row);

      return { label: row.label, price: cell.price, duration: cell.duration };
    }),
  };
};

export const getReviewView = ({
  hasOptions,
  setWizard,
  isReviewReady,
  review,
}: WizardContext) => ({
  isReviewShown: hasOptions || review.own.length > 0,
  isReviewReady,
  openReview: () => {
    if (isReviewReady) setWizard({ review: true });
  },
  review,
});
