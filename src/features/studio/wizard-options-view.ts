// The service wizard's pricing options, own customisations, review grid and add-ons (prototype adjAbs / adjNeg /
// adjSigned / adjErrs, mkVarView, the ownEd dialog values, cellFor / wizRev*, wizAvail / wa / wizSel / na*).
import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import { getAddonPicker } from "./addon-picker";
import { getTaxonomy } from "./studio-service-actions";
import { fmtDur } from "./studio-format";
import { formatAddon, getCatById, getCatsSorted } from "./studio-model";
import type {
  OwnOption,
  StudioAddon,
  VariationRow,
  WizardDraft,
  WizardState,
} from "./studio-types";
import type { StudioController } from "./use-studio";

const SIGN_ADD = "Adds to the base price and time. Click to take off instead.";
const SIGN_OFF = "Takes off the base price and time. Click to add instead.";

export const toNumber = (value: unknown) => {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
};

/** "−5", "05" → "5" (prototype adjAbs). */
export const getAbs = (value: unknown) => {
  const clean = String(value == null ? "" : value)
    .replace(/[^0-9.]/g, "")
    .replace(/^0+(?=\d)/, "");
  return clean === "" ? "0" : clean;
};

/** Whether a row takes off rather than adds (prototype adjNeg). */
export const isNegative = (row: {
  neg?: boolean;
  dp?: string;
  dh?: string;
  dm?: string;
}) =>
  row.neg != null
    ? !!row.neg
    : [row.dp, row.dh, row.dm].some(
        (value) =>
          /^\s*[-−]/.test(String(value == null ? "" : value)) &&
          parseFloat(String(value).replace(/[^0-9.]/g, "")) > 0,
      );

export const getSigned = (value: unknown, isNeg: boolean) => {
  const abs = getAbs(value);
  return (isNeg && parseFloat(abs) > 0 ? "-" : "") + abs;
};

/** Takes off more than the base allows (prototype adjErrs). */
export const getAdjustErrors = (
  isNeg: boolean,
  price: string,
  minutes: number,
  basePrice: number,
  baseMinutes: number,
) => ({
  pErr:
    isNeg && basePrice - (parseFloat(price) || 0) < 0
      ? "This would make the price less than £0."
      : "",
  tErr:
    isNeg && baseMinutes - minutes < 0
      ? "This would make the time less than 0."
      : "",
});

export interface WizardBase {
  basePrice: number;
  baseHours: number;
  baseMinutes: number;
  totalMinutes: number;
}

export const getWizardBase = (draft: WizardDraft): WizardBase => {
  const basePrice = toNumber(draft.price);
  const baseHours = toNumber(draft.durH);
  const baseMinutes = toNumber(draft.durM);
  return {
    basePrice,
    baseHours,
    baseMinutes,
    totalMinutes: baseHours * 60 + baseMinutes,
  };
};

export const getVariationErrors = (row: VariationRow, base: WizardBase) => {
  if (!row.on) return { pErr: "", tErr: "" };
  return getAdjustErrors(
    isNegative(row),
    getAbs(row.dp),
    (parseFloat(getAbs(row.dh)) || 0) * 60 + (parseFloat(getAbs(row.dm)) || 0),
    base.basePrice,
    base.totalMinutes,
  );
};

const getOwnErrors = (option: OwnOption, base: WizardBase) => {
  const isNeg =
    !!option.neg ||
    /^\s*-/.test(String(option.dp || "")) ||
    /^\s*-/.test(String(option.dm || ""));
  return getAdjustErrors(
    isNeg,
    getAbs(option.dp),
    parseFloat(getAbs(option.dm)) || 0,
    base.basePrice,
    base.totalMinutes,
  );
};

/** Sizes / lengths rows with their sign, inputs and errors (prototype mkVarView). */
export const getVariationRows = (
  studio: StudioController,
  key: "sizes" | "lengths",
  rows: VariationRow[],
  base: WizardBase,
) => {
  const { actions, serviceActions } = studio;
  return rows.map((row, index) => {
    const isNeg = isNegative(row);
    const price = getAbs(row.dp);
    const hours = getAbs(row.dh);
    const minutes = getAbs(row.dm);
    const errors = getVariationErrors(row, base);
    const word = key === "sizes" ? "size" : "length";
    const tipKey = key + index;
    const signed = (nextNeg: boolean) => ({
      neg: nextNeg,
      dp: getSigned(price, nextNeg),
      dh: getSigned(hours, nextNeg),
      dm: getSigned(minutes, nextNeg),
    });
    const setField =
      (field: "dp" | "dh" | "dm") => (event: ChangeEvent<HTMLInputElement>) =>
        serviceActions.setVarRow(key, index, {
          neg: isNeg,
          [field]: getSigned(getAbs(event.target.value), isNeg),
        });
    return {
      key: tipKey,
      label: row.label,
      isOn: row.on,
      price,
      hours,
      minutes,
      signText: isNeg ? "−" : "+",
      isNeg,
      signAria: isNeg ? "Take off price and time" : "Add to price and time",
      flip: () => {
        const next = !isNeg;
        serviceActions.setVarRow(key, index, signed(next));
        actions.tipUpdate("s" + tipKey, next ? SIGN_OFF : SIGN_ADD);
      },
      tipSign: (event: MouseEvent | FocusEvent) => {
        if (row.on)
          actions.tipShow(
            event as unknown as { currentTarget: Element },
            "s" + tipKey,
            isNeg ? SIGN_OFF : SIGN_ADD,
          );
      },
      tipCheck: (event: MouseEvent | FocusEvent) =>
        actions.tipShow(
          event as unknown as { currentTarget: Element },
          "c" + tipKey,
          "Offer this " + word,
        ),
      blur: () => {
        actions.tipHide();
        if (
          isNeg &&
          !(parseFloat(price) > 0) &&
          !(parseFloat(hours) > 0) &&
          !(parseFloat(minutes) > 0)
        )
          serviceActions.setVarRow(key, index, signed(false));
      },
      priceError: errors.pErr,
      timeError: errors.tErr,
      toggle: () =>
        serviceActions.setVarRow(
          key,
          index,
          row.on
            ? { on: false }
            : {
                on: true,
                dp: row.dp || "0",
                dh: row.dh || "0",
                dm: row.dm || "0",
              },
        ),
      setPrice: setField("dp"),
      setHours: setField("dh"),
      setMinutes: setField("dm"),
    };
  });
};

/** The "Add / Edit a customisation" dialog (prototype wizOwn*). */
export const getOwnEditor = (
  studio: StudioController,
  wizard: WizardState,
  base: WizardBase,
) => {
  const { actions, serviceActions, setState, context } = studio;
  const { getState } = context;
  const { setWiz, setDraft } = serviceActions;
  const ownList = wizard.draft.own || [];
  const editor = wizard.ownEd || null;
  return {
    rows: ownList.map((group, index) => ({
      key: group.name + index,
      name: group.name,
      meta: group.options
        .map((option) => {
          const price = parseFloat(option.dp) || 0;
          const minutes = parseInt(option.dm) || 0;
          return (
            option.label +
            (price ? (price < 0 ? " −£" : " +£") + Math.abs(price) : "") +
            (minutes
              ? (minutes < 0 ? " −" : " +") + Math.abs(minutes) + " min"
              : "")
          );
        })
        .join(" · "),
      edit: () =>
        setWiz({
          ownEd: {
            idx: index,
            name: group.name,
            options: group.options.map((option) => ({ ...option })),
            err: "",
          },
        }),
      remove: () =>
        setDraft({ own: ownList.filter((_, other) => other !== index) }),
    })),
    editor,
    title:
      editor && editor.idx >= 0 ? "Edit customisation" : "Add a customisation",
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      editor &&
      setWiz({ ownEd: { ...editor, name: event.target.value, err: "" } }),
    options: editor
      ? editor.options.map((option, index) => {
          const isNeg =
            !!option.neg ||
            /^\s*-/.test(String(option.dp || "")) ||
            /^\s*-/.test(String(option.dm || ""));
          const price = getAbs(option.dp);
          const minutes = getAbs(option.dm);
          const errors = getOwnErrors(option, base);
          const name =
            String(option.label || "").trim() || "Option " + (index + 1);
          const tipKey = "own" + index;
          const put = (patch: Partial<OwnOption>) => {
            const next = editor.options.slice();
            next[index] = { ...next[index], ...patch } as OwnOption;
            setWiz({ ownEd: { ...editor, options: next } });
          };
          return {
            key: "o" + index,
            label: option.label,
            price,
            minutes,
            canRemove: editor.options.length > 2,
            signText: isNeg ? "−" : "+",
            isNeg,
            signAria: isNeg
              ? "Take off price and time"
              : "Add to price and time",
            priceAria: name + " price in pounds",
            minutesAria: name + " time in minutes",
            flip: () => {
              const next = !isNeg;
              put({
                neg: next,
                dp: getSigned(price, next),
                dm: getSigned(minutes, next),
              });
              actions.tipUpdate("s" + tipKey, next ? SIGN_OFF : SIGN_ADD);
            },
            tipSign: (event: MouseEvent | FocusEvent) =>
              actions.tipShow(
                event as unknown as { currentTarget: Element },
                "s" + tipKey,
                isNeg ? SIGN_OFF : SIGN_ADD,
              ),
            blur: () => {
              actions.tipHide();
              if (
                isNeg &&
                !(parseFloat(price) > 0) &&
                !(parseFloat(minutes) > 0)
              )
                put({ neg: false, dp: price, dm: minutes });
            },
            priceError: errors.pErr,
            timeError: errors.tErr,
            onLabel: (event: ChangeEvent<HTMLInputElement>) => {
              const next = editor.options.slice();
              next[index] = {
                ...next[index],
                label: event.target.value,
              } as OwnOption;
              setWiz({ ownEd: { ...editor, options: next, err: "" } });
            },
            onPrice: (event: ChangeEvent<HTMLInputElement>) =>
              put({ neg: isNeg, dp: getSigned(event.target.value, isNeg) }),
            onMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
              put({ neg: isNeg, dm: getSigned(event.target.value, isNeg) }),
            remove: () =>
              setWiz({
                ownEd: {
                  ...editor,
                  options: editor.options.filter((_, other) => other !== index),
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
      setWiz({ ownEd: null });
    },
    error: editor ? editor.err || "" : "",
    addOption: () =>
      editor &&
      setWiz({
        ownEd: {
          ...editor,
          options: editor.options.concat([{ label: "", dp: "0", dm: "0" }]),
        },
      }),
    startNew: () =>
      setWiz({
        ownEd: {
          idx: -1,
          name: "",
          options: [
            { label: "", dp: "0", dm: "0" },
            { label: "", dp: "0", dm: "0" },
          ],
          err: "",
        },
      }),
    cancel: () => setWiz({ ownEd: null }),
    save: () => {
      if (!editor) return;
      const name = String(editor.name || "").trim();
      const options = editor.options
        .map((option) => ({
          ...option,
          label: String(option.label || "").trim(),
        }))
        .filter(({ label }) => label);
      if (!name) {
        setWiz({ ownEd: { ...editor, err: "Add a name, like Parting" } });
        return;
      }
      if (options.length < 2) {
        setWiz({ ownEd: { ...editor, err: "Add at least 2 options" } });
        return;
      }
      if (
        options.some((option) => {
          const errors = getOwnErrors(option, base);
          return errors.pErr || errors.tErr;
        })
      )
        return;
      const list = ownList.slice();
      const value = { name, options };
      if (editor.idx >= 0) list[editor.idx] = value;
      else list.push(value);
      const current = getState().wiz;
      if (current)
        setState({
          wiz: {
            ...current,
            ownEd: null,
            draft: { ...current.draft, own: list },
          },
        });
    },
  };
};

/** Base + size + length → price and time (prototype cellFor). */
const getCell = (
  base: WizardBase,
  size: VariationRow | null,
  length: VariationRow | null,
) => {
  const price =
    base.basePrice +
    (size ? toNumber(size.dp) : 0) +
    (length ? toNumber(length.dp) : 0);
  const minutes =
    (base.baseHours +
      (size ? toNumber(size.dh) : 0) +
      (length ? toNumber(length.dh) : 0)) *
      60 +
    base.baseMinutes +
    (size ? toNumber(size.dm) : 0) +
    (length ? toNumber(length.dm) : 0);
  return {
    price: "£" + price,
    dur: fmtDur(Math.floor(minutes / 60), minutes % 60),
  };
};

/** Every bookable combination (prototype wizRev*). */
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
    baseLabel: "Base price " + plain.price + " · " + plain.dur,
    isGrid,
    corner: (draft.cat === "locs" ? "Size" : "Size") + " \\ Length",
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
      return { label: row.label, price: cell.price, dur: cell.dur };
    }),
  };
};

/** Step 4: the add-on picker, the attached list with overrides, and New add-on (prototype wa, wizSel, na*). */
export const getWizardAddons = (
  studio: StudioController,
  wizard: WizardState,
) => {
  const { state, setState, actions, serviceActions } = studio;
  const { setWiz, setDraft } = serviceActions;
  const { draft } = wizard;
  const category = getCatById(state, draft.categoryId)
    ? draft.categoryId
    : null;
  const addonCat =
    wizard.aCat === undefined
      ? category &&
        state.addons.some(({ categoryId }) => categoryId === category)
        ? category
        : "all"
      : wizard.aCat;
  const getCatName = (id: string | null) =>
    getCatById(state, id)?.name ?? "Other add-ons";
  const all: StudioAddon[] = state.addons.concat(wizard.pendAddons || []);
  const { newAddon } = wizard;
  const group = getTaxonomy(draft.cat);
  return {
    picker: getAddonPicker(
      studio,
      state,
      draft.addons.map(({ aid }) => aid),
      (addon) =>
        setDraft({
          addons: draft.addons.concat([
            { aid: addon.id, ovP: null, ovH: null, ovM: null },
          ]),
        }),
      category,
      (addon) =>
        setDraft({
          addons: draft.addons.filter(({ aid }) => aid !== addon.id),
        }),
      null,
      {
        hideSelected: true,
        list: all,
        q: wizard.aq || "",
        cat: wizard.aCat == null ? null : wizard.aCat,
        setQuery: (value) => setWiz({ aq: value }),
        setCat: (value) => setWiz({ aCat: value }),
      },
    ),
    toggleNew: () =>
      setWiz({
        newAddon: newAddon ? null : { name: "", price: "", hr: "", min: "" },
      }),
    newAddon,
    newCatLabel:
      addonCat === "all"
        ? group
          ? group.name
          : "Other"
        : getCatName(addonCat),
    newCatOptions: getCatsSorted(state)
      .map(({ id, name }) => ({ v: id, label: name }))
      .concat([{ v: "none", label: "No category" }]),
    newCat:
      newAddon && newAddon.categoryId !== undefined
        ? newAddon.categoryId || "none"
        : category || "none",
    patchNew: (patch: Partial<NonNullable<typeof newAddon>>) =>
      newAddon && setWiz({ newAddon: { ...newAddon, ...patch } }),
    newHour: String(parseInt(newAddon?.hr ?? "") || 0),
    newMinute: String(parseInt(newAddon?.min ?? "") || 0),
    cancelNew: () => setWiz({ newAddon: null }),
    createNew: () => {
      if (!newAddon || !String(newAddon.name).trim()) {
        actions.toastMsg("Give the add-on a name first");
        return;
      }
      const addon: StudioAddon = {
        id: "ad" + Date.now(),
        categoryId:
          newAddon.categoryId !== undefined ? newAddon.categoryId : category,
        name: String(newAddon.name).trim(),
        price: toNumber(newAddon.price),
        hr: parseInt(newAddon.hr) || 0,
        min: parseInt(newAddon.min) || 0,
      };
      setState({
        addons: state.addons.concat([addon]),
        wiz: {
          ...wizard,
          newAddon: null,
          draft: {
            ...draft,
            addons: draft.addons.concat([
              { aid: addon.id, ovP: null, ovH: null, ovM: null },
            ]),
          },
        },
      });
      actions.toastMsg(
        addon.name + " created. It now lives on your Add-ons tab too",
      );
    },
    selected: draft.addons
      .map((link) => {
        const addon = all.find(({ id }) => id === link.aid);
        if (!addon) return null;
        const isOpen = wizard.openAddon === link.aid;
        const pick = (override: unknown, fallback: unknown) =>
          override != null && override !== "" ? override : fallback;
        const patchLink = (patch: Partial<typeof link>) =>
          setDraft({
            addons: draft.addons.map((item) =>
              item.aid === link.aid ? { ...item, ...patch } : item,
            ),
          });
        return {
          key: link.aid,
          name: addon.name,
          meta: formatAddon({
            price: pick(link.ovP, addon.price),
            hr: pick(link.ovH, addon.hr),
            min: pick(link.ovM, addon.min),
          }),
          isOpen,
          toggle: () => setWiz({ openAddon: isOpen ? null : link.aid }),
          remove: () =>
            setDraft({
              addons: draft.addons.filter(({ aid }) => aid !== link.aid),
            }),
          price: link.ovP != null ? String(link.ovP) : "",
          hours: link.ovH != null ? String(link.ovH) : "",
          minutes: link.ovM != null ? String(link.ovM) : "",
          pricePlaceholder: "" + (addon.price || 0),
          hoursPlaceholder: "" + (addon.hr || 0),
          minutesPlaceholder: "" + (addon.min || 0),
          setPrice: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ ovP: event.target.value }),
          setHours: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ ovH: event.target.value }),
          setMinutes: (event: ChangeEvent<HTMLInputElement>) =>
            patchLink({ ovM: event.target.value }),
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item),
  };
};
