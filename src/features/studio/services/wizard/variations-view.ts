import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import type { VariationRow } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import { makeVariationRows } from "../actions";
import {
  getAbsolute,
  getSign,
  getSigned,
  getSignTip,
  getVariationErrors,
  isNegative,
} from "./adjust";
import type { WizardBase } from "./adjust";
import type { WizardContext } from "./context";

/** Sizes / lengths rows with their sign, inputs and errors. */
export const getVariationRows = (
  studio: StudioController,
  key: "sizes" | "lengths",
  rows: VariationRow[],
  base: WizardBase,
) => {
  const { actions, serviceActions } = studio;

  return rows.map((row, index) => {
    const isNegativeValue = isNegative(row);
    const price = getAbsolute(row.priceDelta);
    const hours = getAbsolute(row.hoursDelta);
    const minutes = getAbsolute(row.minutesDelta);
    const errors = getVariationErrors(row, base);
    const word = key === "sizes" ? "size" : "length";
    const tipKey = key + index;

    const signed = (nextNegative: boolean) => ({
      negative: nextNegative,
      priceDelta: getSigned(price, nextNegative),
      hoursDelta: getSigned(hours, nextNegative),
      minutesDelta: getSigned(minutes, nextNegative),
    });

    const setField =
      (field: "priceDelta" | "hoursDelta" | "minutesDelta") =>
      (event: ChangeEvent<HTMLInputElement>) =>
        serviceActions.setVarRow(key, index, {
          negative: isNegativeValue,
          [field]: getSigned(getAbsolute(event.target.value), isNegativeValue),
        });

    return {
      key: tipKey,
      label: row.label,
      isOn: row.on,
      price,
      hours,
      minutes,
      ...getSign(isNegativeValue),
      flip: () => {
        const next = !isNegativeValue;

        serviceActions.setVarRow(key, index, signed(next));
        actions.tipUpdate(`s${tipKey}`, getSignTip(next));
      },
      tipSign: (event: MouseEvent | FocusEvent) => {
        if (row.on)
          actions.tipShow(event, `s${tipKey}`, getSignTip(isNegativeValue));
      },
      tipCheck: (event: MouseEvent | FocusEvent) =>
        actions.tipShow(event, `c${tipKey}`, `Offer this ${word}`),
      blur: () => {
        actions.tipHide();

        if (
          isNegativeValue &&
          !(parseFloat(price) > 0) &&
          !(parseFloat(hours) > 0) &&
          !(parseFloat(minutes) > 0)
        )
          serviceActions.setVarRow(key, index, signed(false));
      },
      priceError: errors.priceError,
      timeError: errors.timeError,
      toggle: () =>
        serviceActions.setVarRow(
          key,
          index,
          row.on
            ? { on: false }
            : {
                on: true,
                priceDelta: row.priceDelta || "0",
                hoursDelta: row.hoursDelta || "0",
                minutesDelta: row.minutesDelta || "0",
              },
        ),
      setPrice: setField("priceDelta"),
      setHours: setField("hoursDelta"),
      setMinutes: setField("minutesDelta"),
    };
  });
};

export const getVariationsView = ({
  studio,
  draft,
  setDraft,
  group,
  base,
  hasOptions,
}: WizardContext) => ({
  hasSizes: !!group?.sizes,
  hasLengths: !!group?.lengths,
  hasPlatform: !!(group && (group.sizes || group.lengths)),
  isPricingCollapsed: hasOptions,
  toggleSizes: () => {
    const isOn = !draft.sizesOn;

    const getBaseRows = () => {
      if (draft.sizes && draft.sizes.length) return draft.sizes;

      return group?.sizes ? makeVariationRows(group.sizes) : [];
    };

    let rows = getBaseRows();

    if (isOn && rows.length && !rows.some(({ on }) => on))
      rows = rows.map((row, index) =>
        index === 0
          ? {
              ...row,
              on: true,
              negative: false,
              priceDelta: "0",
              hoursDelta: "0",
              minutesDelta: "0",
            }
          : row,
      );

    setDraft({ sizesOn: isOn, sizes: rows });
  },
  toggleLengths: () =>
    setDraft({
      lengthsOn: !draft.lengthsOn,
      ...((!draft.lengths || !draft.lengths.length) && group?.lengths
        ? { lengths: makeVariationRows(group.lengths) }
        : {}),
    }),
  sizeHead: draft.taxonomyId === "locs" ? "Size" : "Size / thickness",
  sizeRows: getVariationRows(studio, "sizes", draft.sizes || [], base),
  lengthRows: getVariationRows(studio, "lengths", draft.lengths || [], base),
});
