import { parseNumber } from "../../core/format";
import type { VariationRow, WizardDraft } from "../../core/types";
import { formatDuration } from "../../../../utils/dates";
import type { WizardBase } from "./adjust";
import type { WizardContext } from "./context";
import { formatMoney } from "../../../../utils/money";

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
    price: `${formatMoney(price)}`,
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
  isReviewShown: hasOptions,
  isReviewReady,
  openReview: () => {
    if (isReviewReady) setWizard({ review: true });
  },
  review,
});
