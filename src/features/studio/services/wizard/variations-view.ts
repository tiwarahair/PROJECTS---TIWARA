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
import { getDeltaLabel } from "../../../booking/logic/pricing";
import { getHourOptions, getMinuteOptions } from "./time-options";

type VariationKey = "sizes" | "lengths";

const toNumber = (value: string) => parseFloat(value) || 0;

/** "+£10 +30m", as on the booking screens */
const getDeltaText = (row: VariationRow) =>
  row.on
    ? getDeltaLabel(
        {
          priceDelta: toNumber(row.priceDelta),
          minutesDelta:
            toNumber(row.hoursDelta) * 60 + toNumber(row.minutesDelta),
        },
        true,
      )
    : "";

/** One size / length option: its sign, inputs and errors, edited through setRow. */
export const getVariationRow = (
  studio: StudioController,
  key: VariationKey,
  index: number,
  row: VariationRow,
  base: WizardBase,
  setRow: (patch: Partial<VariationRow>) => void,
) => {
  const { actions } = studio;
  const isNegativeValue = isNegative(row);
  const price = getAbsolute(row.priceDelta);
  const hours = getAbsolute(row.hoursDelta);
  const minutes = getAbsolute(row.minutesDelta);
  const errors = getVariationErrors(row, base);
  const tipKey = key + index;

  const signed = (nextNegative: boolean) => ({
    negative: nextNegative,
    priceDelta: getSigned(price, nextNegative),
    hoursDelta: getSigned(hours, nextNegative),
    minutesDelta: getSigned(minutes, nextNegative),
  });

  const setField =
    (field: "priceDelta" | "hoursDelta" | "minutesDelta") =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setRow({
        negative: isNegativeValue,
        [field]: getSigned(getAbsolute(event.target.value), isNegativeValue),
      });

  return {
    key: tipKey,
    index,
    label: row.label,
    isOn: row.on,
    price,
    hours,
    minutes,
    hourOptions: getHourOptions(hours),
    minuteOptions: getMinuteOptions(minutes),
    deltaText: getDeltaText(row),
    ...getSign(isNegativeValue),
    flip: () => {
      const next = !isNegativeValue;

      setRow(signed(next));
      actions.tipUpdate(`s${tipKey}`, getSignTip(next));
    },
    tipSign: (event: MouseEvent | FocusEvent) => {
      if (row.on)
        actions.tipShow(event, `s${tipKey}`, getSignTip(isNegativeValue));
    },
    blur: () => {
      actions.tipHide();

      if (
        isNegativeValue &&
        !(parseFloat(price) > 0) &&
        !(parseFloat(hours) > 0) &&
        !(parseFloat(minutes) > 0)
      )
        setRow(signed(false));
    },
    priceError: errors.priceError,
    timeError: errors.timeError,
    toggle: () =>
      setRow(
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
};

export type VariationRowView = ReturnType<typeof getVariationRow>;

/** The chips under a size / length card; each opens the option sheet with a copy to edit. */
const getVariationChips = (
  { studio, wizard, base }: WizardContext,
  key: VariationKey,
  rows: VariationRow[],
) =>
  rows.map((row, index) => ({
    ...getVariationRow(studio, key, index, row, base, (patch) =>
      studio.serviceActions.setVarRow(key, index, patch),
    ),
    open: () =>
      studio.serviceActions.setWizard({
        variationEdit: { key, index, row: { ...row } },
      }),
    isEditing:
      wizard.variationEdit?.key === key && wizard.variationEdit.index === index,
  }));

const getSizeHead = (taxonomyId: string | null | undefined) =>
  taxonomyId === "locs" ? "Size" : "Size / thickness";

/** The option sheet: the copy being edited, then Save writes it back to the draft. */
const getVariationSheet = ({ studio, wizard, base, draft }: WizardContext) => {
  const edit = wizard.variationEdit;

  if (!edit) return null;

  const { setWizard, setVarRow } = studio.serviceActions;
  const close = () => setWizard({ variationEdit: null });

  return {
    ...getVariationRow(studio, edit.key, edit.index, edit.row, base, (patch) =>
      setWizard({ variationEdit: { ...edit, row: { ...edit.row, ...patch } } }),
    ),
    word: edit.key === "sizes" ? "size" : "length",
    name: edit.key === "sizes" ? getSizeHead(draft.taxonomyId) : "Length",
    cancel: close,
    // Escape first closes the sign tooltip, then the sheet
    onKey: (event: { key: string; stopPropagation: () => void }) => {
      if (event.key !== "Escape") return;

      event.stopPropagation();

      if (studio.state.tip) {
        studio.actions.tipHide();

        return;
      }

      close();
    },
    save: () => {
      setVarRow(edit.key, edit.index, edit.row);
      close();
    },
  };
};

export const getVariationsView = (context: WizardContext) => {
  const { draft, setDraft, group } = context;

  return {
    hasSizes: !!group?.sizes,
    hasLengths: !!group?.lengths,
    hasPlatform: !!(group && (group.sizes || group.lengths)),
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
    sizeHead: getSizeHead(draft.taxonomyId),
    variationSheet: getVariationSheet(context),
    sizeRows: getVariationChips(context, "sizes", draft.sizes || []),
    lengthRows: getVariationChips(context, "lengths", draft.lengths || []),
  };
};
