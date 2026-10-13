// The service wizard's pricing options, own customisations, review grid and add-ons.
import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import { getAddonPicker } from "./addon-picker";
import { parseNumber } from "./studio-format";
import { getTaxonomy } from "./studio-service-actions";
import {
  formatAddon,
  getCategoryById,
  getSortedCategories,
} from "./studio-model";
import type {
  OwnOption,
  StudioAddon,
  VariationRow,
  WizardDraft,
  WizardState,
} from "./studio-types";
import type { StudioController } from "./use-studio";
import { formatDuration } from "../../utils/dates";

const SIGN_ADD = "Adds to the base price and time. Click to take off instead.";
const SIGN_OFF = "Takes off the base price and time. Click to add instead.";

/** "−5", "05" → "5". */
const getAbsolute = (value: string) => {
  const clean = value.replace(/[^0-9.]/g, "").replace(/^0+(?=\d)/, "");

  return clean === "" ? "0" : clean;
};

/** Whether a row takes off rather than adds. */
const isNegative = (row: {
  negative?: boolean;
  priceDelta?: string;
  hoursDelta?: string;
  minutesDelta?: string;
}) =>
  row.negative != null
    ? !!row.negative
    : [row.priceDelta, row.hoursDelta, row.minutesDelta].some(
        (value) =>
          /^\s*[-−]/.test(value ?? "") &&
          parseFloat((value ?? "").replace(/[^0-9.]/g, "")) > 0,
      );

const getSigned = (value: string, isNegativeValue: boolean) => {
  const absoluteValue = getAbsolute(value);

  return (
    (isNegativeValue && parseFloat(absoluteValue) > 0 ? "-" : "") +
    absoluteValue
  );
};

/** Takes off more than the base allows. */
const getAdjustErrors = (
  isNegativeValue: boolean,
  price: string,
  minutes: number,
  basePrice: number,
  baseMinutes: number,
) => ({
  priceError:
    isNegativeValue && basePrice - (parseFloat(price) || 0) < 0
      ? "This would make the price less than £0."
      : "",
  timeError:
    isNegativeValue && baseMinutes - minutes < 0
      ? "This would make the time less than 0."
      : "",
});

interface WizardBase {
  basePrice: number;
  baseHours: number;
  baseMinutes: number;
  totalMinutes: number;
}

export const getWizardBase = (draft: WizardDraft): WizardBase => {
  const basePrice = parseNumber(draft.price);
  const baseHours = parseNumber(draft.durationHours);
  const baseMinutes = parseNumber(draft.durationMinutes);

  return {
    basePrice,
    baseHours,
    baseMinutes,
    totalMinutes: baseHours * 60 + baseMinutes,
  };
};

export const getVariationErrors = (row: VariationRow, base: WizardBase) => {
  if (!row.on) return { priceError: "", timeError: "" };

  return getAdjustErrors(
    isNegative(row),
    getAbsolute(row.priceDelta),
    (parseFloat(getAbsolute(row.hoursDelta)) || 0) * 60 +
      (parseFloat(getAbsolute(row.minutesDelta)) || 0),
    base.basePrice,
    base.totalMinutes,
  );
};

const getOwnErrors = (option: OwnOption, base: WizardBase) => {
  const isNegativeValue =
    !!option.negative ||
    /^\s*-/.test(option.priceDelta) ||
    /^\s*-/.test(option.minutesDelta);

  return getAdjustErrors(
    isNegativeValue,
    getAbsolute(option.priceDelta),
    parseFloat(getAbsolute(option.minutesDelta)) || 0,
    base.basePrice,
    base.totalMinutes,
  );
};

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
      signText: isNegativeValue ? "−" : "+",
      isNegativeValue,
      signAria: isNegativeValue
        ? "Take off price and time"
        : "Add to price and time",
      flip: () => {
        const next = !isNegativeValue;

        serviceActions.setVarRow(key, index, signed(next));
        actions.tipUpdate(`s${tipKey}`, next ? SIGN_OFF : SIGN_ADD);
      },
      tipSign: (event: MouseEvent | FocusEvent) => {
        if (row.on)
          actions.tipShow(
            event,
            `s${tipKey}`,
            isNegativeValue ? SIGN_OFF : SIGN_ADD,
          );
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

/** The "Add / Edit a customisation" dialog. */
export const getOwnEditor = (
  studio: StudioController,
  wizard: WizardState,
  base: WizardBase,
) => {
  const { actions, serviceActions, setState, context } = studio;
  const { getState } = context;
  const { setWizard, setDraft } = serviceActions;
  const ownList = wizard.draft.own || [];
  const editor = wizard.ownEdit || null;

  return {
    rows: ownList.map((group, index) => ({
      key: group.name + index,
      name: group.name,
      meta: group.options
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
        .join(" · "),
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
    options: editor
      ? editor.options.map((option, index) => {
          const isNegativeValue =
            !!option.negative ||
            /^\s*-/.test(option.priceDelta) ||
            /^\s*-/.test(option.minutesDelta);

          const price = getAbsolute(option.priceDelta);
          const minutes = getAbsolute(option.minutesDelta);
          const errors = getOwnErrors(option, base);

          const name = option.label.trim() || `Option ${index + 1}`;

          const tipKey = `own${index}`;

          const put = (patch: Partial<OwnOption>) => {
            const next = editor.options.slice();

            next[index] = { ...next[index], ...patch } as OwnOption;
            setWizard({ ownEdit: { ...editor, options: next } });
          };

          return {
            key: `o${index}`,
            label: option.label,
            price,
            minutes,
            canRemove: editor.options.length > 2,
            signText: isNegativeValue ? "−" : "+",
            isNegativeValue,
            signAria: isNegativeValue
              ? "Take off price and time"
              : "Add to price and time",
            priceAria: `${name} price in pounds`,
            minutesAria: `${name} time in minutes`,
            flip: () => {
              const next = !isNegativeValue;

              put({
                negative: next,
                priceDelta: getSigned(price, next),
                minutesDelta: getSigned(minutes, next),
              });

              actions.tipUpdate(`s${tipKey}`, next ? SIGN_OFF : SIGN_ADD);
            },
            tipSign: (event: MouseEvent | FocusEvent) =>
              actions.tipShow(
                event,
                `s${tipKey}`,
                isNegativeValue ? SIGN_OFF : SIGN_ADD,
              ),
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
            onLabel: (event: ChangeEvent<HTMLInputElement>) => {
              const next = editor.options.slice();

              next[index] = {
                ...next[index],
                label: event.target.value,
              } as OwnOption;

              setWizard({ ownEdit: { ...editor, options: next, error: "" } });
            },
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
                  options: editor.options.filter(
                    (_item, other) => other !== index,
                  ),
                },
              }),
          };
        })
      : [],
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
          options: editor.options.concat([
            { label: "", priceDelta: "0", minutesDelta: "0" },
          ]),
        },
      }),
    startNew: () =>
      setWizard({
        ownEdit: {
          index: -1,
          name: "",
          options: [
            { label: "", priceDelta: "0", minutesDelta: "0" },
            { label: "", priceDelta: "0", minutesDelta: "0" },
          ],
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

      if (
        options.some((option) => {
          const errors = getOwnErrors(option, base);

          return errors.priceError || errors.timeError;
        })
      )
        return;

      const list = ownList.slice();
      const value = { name, options };

      if (editor.index >= 0) list[editor.index] = value;
      else list.push(value);

      const current = getState().wizard;

      if (current)
        setState({
          wizard: {
            ...current,
            ownEdit: null,
            draft: { ...current.draft, own: list },
          },
        });
    },
  };
};

/** Base + size + length → price and time. */
const getCell = (
  base: WizardBase,
  size: VariationRow | null,
  length: VariationRow | null,
) => {
  const price =
    base.basePrice +
    (size ? parseNumber(size.priceDelta) : 0) +
    (length ? parseNumber(length.priceDelta) : 0);

  const minutes =
    (base.baseHours +
      (size ? parseNumber(size.hoursDelta) : 0) +
      (length ? parseNumber(length.hoursDelta) : 0)) *
      60 +
    base.baseMinutes +
    (size ? parseNumber(size.minutesDelta) : 0) +
    (length ? parseNumber(length.minutesDelta) : 0);

  return {
    price: `£${price}`,
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
    corner: `${draft.taxonomyId === "locs" ? "Size" : "Size"} \\ Length`,
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

/** Step 4: the add-on picker, the attached list with overrides, and New add-on. */
export const getWizardAddons = (
  studio: StudioController,
  wizard: WizardState,
) => {
  const { state, setState, actions, serviceActions } = studio;
  const { setWizard, setDraft } = serviceActions;
  const { draft } = wizard;

  const category = getCategoryById(state, draft.categoryId)
    ? draft.categoryId
    : null;

  const getAddonCategoryValue = () => {
    if (wizard.addonCategory !== undefined) return wizard.addonCategory;

    return category &&
      state.addons.some(({ categoryId }) => categoryId === category)
      ? category
      : "all";
  };

  const addonCategory = getAddonCategoryValue();

  const getCategoryName = (id: string | null) =>
    getCategoryById(state, id)?.name ?? "Other add-ons";

  const all: StudioAddon[] = state.addons.concat(wizard.pendingAddons || []);
  const { newAddon } = wizard;
  const group = getTaxonomy(draft.taxonomyId);

  const getNewCategoryLabel = () => {
    if (addonCategory !== "all") return getCategoryName(addonCategory);

    return group ? group.name : "Other";
  };

  return {
    picker: getAddonPicker(
      studio,
      state,
      draft.addons.map(({ addonId }) => addonId),
      (addon) =>
        setDraft({
          addons: draft.addons.concat([
            {
              addonId: addon.id,
              priceOverride: null,
              hoursOverride: null,
              minutesOverride: null,
            },
          ]),
        }),
      category,
      (addon) =>
        setDraft({
          addons: draft.addons.filter(({ addonId }) => addonId !== addon.id),
        }),
      null,
      {
        hideSelected: true,
        list: all,
        query: wizard.addonQuery || "",
        category: wizard.addonCategory == null ? null : wizard.addonCategory,
        setQuery: (value) => setWizard({ addonQuery: value }),
        setCategory: (value) => setWizard({ addonCategory: value }),
      },
    ),
    toggleNew: () =>
      setWizard({
        newAddon: newAddon ? null : { name: "", price: "", hours: "", min: "" },
      }),
    newAddon,
    newCategoryLabel: getNewCategoryLabel(),
    newCategoryOptions: getSortedCategories(state)
      .map(({ id, name }) => ({ value: id, label: name }))
      .concat([{ value: "none", label: "No category" }]),
    newCategory:
      newAddon && newAddon.categoryId !== undefined
        ? newAddon.categoryId || "none"
        : category || "none",
    patchNew: (patch: Partial<NonNullable<typeof newAddon>>) =>
      newAddon && setWizard({ newAddon: { ...newAddon, ...patch } }),
    newHour: String(parseInt(newAddon?.hours ?? "") || 0),
    newMinute: String(parseInt(newAddon?.min ?? "") || 0),
    cancelNew: () => setWizard({ newAddon: null }),
    createNew: () => {
      if (!newAddon || !newAddon.name.trim()) {
        actions.showToast("Give the add-on a name first");

        return;
      }

      const addon: StudioAddon = {
        id: crypto.randomUUID(),
        categoryId:
          newAddon.categoryId !== undefined ? newAddon.categoryId : category,
        name: newAddon.name.trim(),
        price: parseNumber(newAddon.price),
        hours: parseInt(newAddon.hours) || 0,
        min: parseInt(newAddon.min) || 0,
      };

      setState({
        addons: state.addons.concat([addon]),
        wizard: {
          ...wizard,
          newAddon: null,
          draft: {
            ...draft,
            addons: draft.addons.concat([
              {
                addonId: addon.id,
                priceOverride: null,
                hoursOverride: null,
                minutesOverride: null,
              },
            ]),
          },
        },
      });

      actions.showToast(
        `${addon.name} created. It now lives on your Add-ons tab too`,
      );
    },
    selected: draft.addons
      .map((link) => {
        const addon = all.find(({ id }) => id === link.addonId);

        if (!addon) return null;

        const isOpen = wizard.openAddon === link.addonId;

        const pick = (
          override: string | number | null,
          fallback: string | number,
        ) => (override != null && override !== "" ? override : fallback);

        const patchLink = (patch: Partial<typeof link>) =>
          setDraft({
            addons: draft.addons.map((item) =>
              item.addonId === link.addonId ? { ...item, ...patch } : item,
            ),
          });

        return {
          key: link.addonId,
          name: addon.name,
          meta: formatAddon({
            price: pick(link.priceOverride, addon.price),
            hours: pick(link.hoursOverride, addon.hours),
            min: pick(link.minutesOverride, addon.min),
          }),
          isOpen,
          toggle: () => setWizard({ openAddon: isOpen ? null : link.addonId }),
          remove: () =>
            setDraft({
              addons: draft.addons.filter(
                ({ addonId }) => addonId !== link.addonId,
              ),
            }),
          price: link.priceOverride != null ? String(link.priceOverride) : "",
          hours: link.hoursOverride != null ? String(link.hoursOverride) : "",
          minutes:
            link.minutesOverride != null ? String(link.minutesOverride) : "",
          pricePlaceholder: `${addon.price || 0}`,
          hoursPlaceholder: `${addon.hours || 0}`,
          minutesPlaceholder: `${addon.min || 0}`,
          setPrice: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ priceOverride: event.target.value }),
          setHours: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ hoursOverride: event.target.value }),
          setMinutes: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ minutesOverride: event.target.value }),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
  };
};
