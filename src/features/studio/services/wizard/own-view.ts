import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import type { OwnOption, WizardState } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import {
  getAbsolute,
  getOwnErrors,
  getSign,
  getSigned,
  getSignTip,
  hasErrors,
  isOwnNegative,
} from "./adjust";
import type { WizardBase } from "./adjust";
import { setLatestWizard } from "./context";

const makeOption = (): OwnOption => ({
  label: "",
  priceDelta: "0",
  minutesDelta: "0",
});

const getMeta = ({ options }: { options: OwnOption[] }) =>
  options
    .map((option) => {
      const price = parseFloat(option.priceDelta) || 0;
      const minutes = parseInt(option.minutesDelta) || 0;

      return (
        option.label +
        (price ? (price < 0 ? " −£" : " +£") + Math.abs(price) : "") +
        (minutes
          ? `${(minutes < 0 ? " −" : " +") + Math.abs(minutes)} min`
          : "")
      );
    })
    .join(" · ");

const getOptionRows = (
  { actions, serviceActions }: StudioController,
  editor: NonNullable<WizardState["ownEdit"]>,
  base: WizardBase,
) => {
  const { setWizard } = serviceActions;

  return editor.options.map((option, index) => {
    const isNegativeValue = isOwnNegative(option);
    const price = getAbsolute(option.priceDelta);
    const minutes = getAbsolute(option.minutesDelta);
    const errors = getOwnErrors(option, base);

    const name = option.label.trim() || `Option ${index + 1}`;

    const tipKey = `own${index}`;

    const put = (patch: Partial<OwnOption>, extra: { error?: string } = {}) => {
      const next = editor.options.slice();

      next[index] = { ...next[index], ...patch } as OwnOption;
      setWizard({ ownEdit: { ...editor, options: next, ...extra } });
    };

    return {
      key: `o${index}`,
      label: option.label,
      price,
      minutes,
      canRemove: editor.options.length > 2,
      ...getSign(isNegativeValue),
      priceAria: `${name} price in pounds`,
      minutesAria: `${name} time in minutes`,
      flip: () => {
        const next = !isNegativeValue;

        put({
          negative: next,
          priceDelta: getSigned(price, next),
          minutesDelta: getSigned(minutes, next),
        });

        actions.tipUpdate(`s${tipKey}`, getSignTip(next));
      },
      tipSign: (event: MouseEvent | FocusEvent) =>
        actions.tipShow(event, `s${tipKey}`, getSignTip(isNegativeValue)),
      blur: () => {
        actions.tipHide();

        if (
          isNegativeValue &&
          !(parseFloat(price) > 0) &&
          !(parseFloat(minutes) > 0)
        )
          put({
            negative: false,
            priceDelta: price,
            minutesDelta: minutes,
          });
      },
      priceError: errors.priceError,
      timeError: errors.timeError,
      onLabel: (event: ChangeEvent<HTMLInputElement>) =>
        put({ label: event.target.value }, { error: "" }),
      onPrice: (event: ChangeEvent<HTMLInputElement>) =>
        put({
          negative: isNegativeValue,
          priceDelta: getSigned(event.target.value, isNegativeValue),
        }),
      onMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
        put({
          negative: isNegativeValue,
          minutesDelta: getSigned(event.target.value, isNegativeValue),
        }),
      remove: () =>
        setWizard({
          ownEdit: {
            ...editor,
            options: editor.options.filter((_item, other) => other !== index),
          },
        }),
    };
  });
};

/** The "Add / Edit a customisation" dialog. */
export const getOwnEditor = (
  studio: StudioController,
  wizard: WizardState,
  base: WizardBase,
) => {
  const { actions, serviceActions, context } = studio;
  const { getState } = context;
  const { setWizard, setDraft } = serviceActions;
  const ownList = wizard.draft.own || [];
  const editor = wizard.ownEdit || null;

  return {
    rows: ownList.map((group, index) => ({
      key: group.name + index,
      name: group.name,
      meta: getMeta(group),
      edit: () =>
        setWizard({
          ownEdit: {
            index,
            name: group.name,
            options: group.options.map((option) => ({ ...option })),
            error: "",
          },
        }),
      remove: () =>
        setDraft({ own: ownList.filter((_item, other) => other !== index) }),
    })),
    editor,
    title:
      editor && editor.index >= 0
        ? "Edit customisation"
        : "Add a customisation",
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      editor &&
      setWizard({
        ownEdit: { ...editor, name: event.target.value, error: "" },
      }),
    options: editor ? getOptionRows(studio, editor, base) : [],
    onKey: (event: { key: string; stopPropagation: () => void }) => {
      if (event.key !== "Escape") return;

      event.stopPropagation();

      if (getState().tip) {
        actions.tipHide();

        return;
      }

      setWizard({ ownEdit: null });
    },
    error: editor ? editor.error || "" : "",
    addOption: () =>
      editor &&
      setWizard({
        ownEdit: {
          ...editor,
          options: editor.options.concat([makeOption()]),
        },
      }),
    startNew: () =>
      setWizard({
        ownEdit: {
          index: -1,
          name: "",
          options: [makeOption(), makeOption()],
          error: "",
        },
      }),
    cancel: () => setWizard({ ownEdit: null }),
    save: () => {
      if (!editor) return;

      const name = editor.name.trim();

      const options = editor.options
        .map((option) => ({
          ...option,
          label: option.label.trim(),
        }))
        .filter(({ label }) => label);

      if (!name) {
        setWizard({
          ownEdit: { ...editor, error: "Add a name, like Parting" },
        });

        return;
      }

      if (options.length < 2) {
        setWizard({ ownEdit: { ...editor, error: "Add at least 2 options" } });

        return;
      }

      if (options.some((option) => hasErrors(getOwnErrors(option, base))))
        return;

      const list = ownList.slice();
      const value = { name, options };

      if (editor.index >= 0) list[editor.index] = value;
      else list.push(value);

      setLatestWizard(studio, { ownEdit: null }, { own: list });
    },
  };
};
