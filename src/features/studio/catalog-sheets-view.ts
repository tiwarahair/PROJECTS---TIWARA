// The Manage categories and add-on sheets (prototype swatches, catsVals and the addonV block of renderVals).
import type { ChangeEvent } from "react";
import type { SearchSelectOption } from "../../components/search-select/search-select";
import { CAT_COLOURS, NO_CAT_TONE } from "./studio-data";
import {
  getCatById,
  getCatNameError,
  getCatsSorted,
  getNextCatColour,
} from "./studio-model";
import type { CategoriesUi } from "./studio-types";
import type { StudioController } from "./use-studio";

export interface Swatch {
  key: string;
  name: string;
  bg: string;
  isOn: boolean;
  ring: string;
  pick: () => void;
}

/** The category colour picker (prototype swatches). */
export const getSwatches = (
  selected: string | null | undefined,
  onPick: (value: string) => void,
): Swatch[] =>
  CAT_COLOURS.map(({ name, value }) => {
    const isOn = value === selected;
    return {
      key: name,
      name,
      bg: value,
      isOn,
      ring: isOn
        ? "0 0 0 2px #fff, 0 0 0 4px " + value
        : "inset 0 0 0 1px rgba(26,23,20,.08)",
      pick: () => onPick(value),
    };
  });

export const DUR_HOUR_OPTIONS = Array.from({ length: 13 }, (_, hour) => ({
  v: String(hour),
  label: hour + (hour === 1 ? " hr" : " hrs"),
}));
export const DUR_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  v: String(index * 5),
  label: index * 5 + (index * 5 === 1 ? " min" : " mins"),
}));

const toNumber = (value: unknown) => {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
};

/** Manage categories: reorder, rename, recolour, delete and add (prototype catsVals). */
export const getCategoriesView = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const ui: Partial<CategoriesUi> = state.catsUi || {};
  const setUi = (patch: Partial<CategoriesUi>) =>
    setState(({ catsUi }) => ({
      catsUi: { ...catsUi, ...patch } as CategoriesUi,
    }));
  const list = getCatsSorted(state);
  const move = (index: number, step: number) => {
    const next = list.slice();
    const target = index + step;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const other = next[target];
    if (!current || !other) return;
    next[index] = other;
    next[target] = current;
    setState({
      categories: next.map((category, sort) => ({ ...category, sort })),
    });
  };
  const newError = ui.newErr || "";
  return {
    isEmpty: !list.length,
    rows: list.map((category, index) => {
      const count = state.services.filter(
        ({ categoryId }) => categoryId === category.id,
      ).length;
      const isEditing = ui.editId === category.id;
      const editError = isEditing ? ui.editErr || "" : "";
      const colourName =
        CAT_COLOURS.find(({ value }) => value === category.colour)?.name || "";
      return {
        key: category.id,
        name: category.name,
        dot: category.colour,
        meta:
          count +
          (count === 1 ? " service" : " services") +
          (colourName ? " · " + colourName : ""),
        isEditing,
        up: () => move(index, -1),
        down: () => move(index, 1),
        isUpOff: index === 0,
        isDownOff: index === list.length - 1,
        edit: () =>
          setUi({
            editId: category.id,
            editName: category.name,
            editColour: category.colour,
            editErr: "",
          }),
        remove: () => {
          const addonCount = state.addons.filter(
            ({ categoryId }) => categoryId === category.id,
          ).length;
          setState({
            confirm: {
              title: "Delete ‘" + category.name + "’?",
              body:
                "Its " +
                count +
                (count === 1 ? " service moves" : " services move") +
                " to Other services" +
                (addonCount
                  ? " and " +
                    addonCount +
                    (addonCount === 1 ? " add-on moves" : " add-ons move") +
                    " to Other add-ons"
                  : "") +
                ".",
              yesLabel: "Delete",
              noLabel: "Keep it",
              yes: () => {
                setState((current) => ({
                  categories: current.categories
                    .filter(({ id }) => id !== category.id)
                    .sort((first, second) => first.sort - second.sort)
                    .map((item, sort) => ({ ...item, sort })),
                  services: current.services.map((item) =>
                    item.categoryId === category.id
                      ? { ...item, categoryId: null }
                      : item,
                  ),
                  addons: current.addons.map((item) =>
                    item.categoryId === category.id
                      ? { ...item, categoryId: null }
                      : item,
                  ),
                  confirm: null,
                  svcCat:
                    current.svcCat === category.id ? "all" : current.svcCat,
                  addonCat:
                    current.addonCat === category.id ? "all" : current.addonCat,
                }));
                actions.toastMsg(category.name + " deleted");
              },
            },
          });
        },
        editName: isEditing ? ui.editName || "" : "",
        onEditName: (event: ChangeEvent<HTMLInputElement>) =>
          setUi({ editName: event.target.value.slice(0, 40), editErr: "" }),
        editError,
        swatches: isEditing
          ? getSwatches(ui.editColour, (value) => setUi({ editColour: value }))
          : [],
        save: () => {
          const error = getCatNameError(state, ui.editName || "", category.id);
          if (error) {
            setUi({ editErr: error });
            return;
          }
          setState((current) => ({
            categories: current.categories.map((item) =>
              item.id === category.id
                ? {
                    ...item,
                    name: (ui.editName || "").trim(),
                    colour: ui.editColour || item.colour,
                  }
                : item,
            ),
            catsUi: { ...current.catsUi, editId: null } as CategoriesUi,
          }));
          actions.toastMsg("Category saved");
        },
        cancel: () => setUi({ editId: null, editErr: "" }),
      };
    }),
    newName: ui.newName || "",
    onNewName: (event: ChangeEvent<HTMLInputElement>) =>
      setUi({ newName: event.target.value.slice(0, 40), newErr: "" }),
    newError,
    newSwatches: getSwatches(ui.newColour, (value) =>
      setUi({ newColour: value }),
    ),
    add: () => {
      const result = serviceActions.addCategory(ui.newName || "", ui.newColour);
      if (result.err !== undefined) {
        setUi({ newErr: result.err });
        return;
      }
      actions.toastMsg(result.cat.name + " added");
      window.setTimeout(
        () =>
          setState(({ catsUi, categories }) => ({
            catsUi: {
              ...catsUi,
              newName: "",
              newErr: "",
              newColour: getNextCatColour(categories),
            } as CategoriesUi,
          })),
        0,
      );
    },
  };
};

/** Create or edit an add-on (prototype addonV). */
export const getAddonSheetView = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const draft = state.sheet === "addon" ? state.addonDraft : null;
  if (!draft) return null;
  const isBad = !String(draft.name).trim();
  const patch = (value: Partial<typeof draft>) =>
    setState({ addonDraft: { ...draft, ...value } });
  const { adNewCat } = state;
  return {
    name: draft.name,
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      patch({ name: event.target.value }),
    hourValue: String(parseInt(String(draft.hr)) || 0),
    minuteValue: String(parseInt(String(draft.min)) || 0),
    price: String(draft.price),
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      patch({ price: event.target.value }),
    onHour: (event: ChangeEvent<HTMLSelectElement>) =>
      patch({ hr: event.target.value }),
    onMinute: (event: ChangeEvent<HTMLSelectElement>) =>
      patch({ min: event.target.value }),
    catOptions: (
      [{ label: "No category", dot: NO_CAT_TONE }] as SearchSelectOption[]
    )
      .concat(
        getCatsSorted(state).map(({ name, colour }) => ({
          label: name,
          dot: colour,
        })),
      )
      .concat([{ label: "+ New category", action: true }]),
    catValue: getCatById(state, draft.categoryId)?.name || "No category",
    pickCat: (label: string) => {
      if (label === "+ New category") {
        setState({
          adNewCat: {
            name: "",
            colour: getNextCatColour(state.categories),
            err: "",
          },
        });
        return;
      }
      const category = getCatsSorted(state).find(({ name }) => name === label);
      patch({ categoryId: category ? category.id : null });
    },
    newCat: adNewCat ?? null,
    onNewCatName: (event: ChangeEvent<HTMLInputElement>) =>
      adNewCat &&
      setState({
        adNewCat: {
          ...adNewCat,
          name: event.target.value.slice(0, 40),
          err: "",
        },
      }),
    newCatSwatches: adNewCat
      ? getSwatches(adNewCat.colour, (value) =>
          setState(({ adNewCat: current }) => ({
            adNewCat: current ? { ...current, colour: value } : current,
          })),
        )
      : [],
    addNewCat: () => {
      if (!adNewCat) return;
      const result = serviceActions.addCategory(adNewCat.name, adNewCat.colour);
      if (result.err !== undefined) {
        setState({ adNewCat: { ...adNewCat, err: result.err } });
        return;
      }
      window.setTimeout(
        () =>
          setState(({ addonDraft }) => ({
            adNewCat: null,
            addonDraft: addonDraft
              ? { ...addonDraft, categoryId: result.id }
              : addonDraft,
          })),
        0,
      );
    },
    cancelNewCat: () => setState({ adNewCat: null }),
    cta: draft.id ? "Save add-on" : "Create add-on",
    isDisabled: isBad,
    save: () => {
      if (isBad) return;
      const addon = {
        id: draft.id || "ad" + Date.now(),
        categoryId: getCatById(state, draft.categoryId)
          ? draft.categoryId
          : null,
        st: draft.st || "active",
        name: String(draft.name).trim(),
        price: toNumber(draft.price),
        hr: parseInt(String(draft.hr)) || 0,
        min: parseInt(String(draft.min)) || 0,
      };
      setState({
        addons: draft.id
          ? state.addons.map((item) => (item.id === draft.id ? addon : item))
          : state.addons.concat([addon]),
        svcTab: "addons",
      });
      actions.toastMsg(
        draft.id
          ? addon.name + " updated"
          : addon.name + " added to your add-ons",
      );
      actions.closeSheet();
    },
  };
};

export type CategoriesView = ReturnType<typeof getCategoriesView>;
export type AddonSheetView = NonNullable<ReturnType<typeof getAddonSheetView>>;
