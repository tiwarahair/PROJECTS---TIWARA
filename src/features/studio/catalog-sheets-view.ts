// The Manage categories and add-on sheets, and the category colour picker.
import type { ChangeEvent } from "react";
import type { SearchSelectOption } from "../../components/search-select/search-select";
import { CATEGORY_COLOURS, NO_CATEGORY_TONE } from "./studio-data";
import { parseNumber, parseWholeNumber } from "./studio-format";
import {
  getCategoryById,
  getCategoryNameError,
  getSortedCategories,
  getNextCategoryColour,
} from "./studio-model";
import type { CategoriesUi } from "./studio-types";
import type { StudioController } from "./use-studio";

export interface Swatch {
  key: string;
  name: string;
  background: string;
  isOn: boolean;
  ring: string;
  pick: () => void;
}

/** The category colour picker. */
export const getSwatches = (
  selected: string | null | undefined,
  onPick: (value: string) => void,
): Swatch[] =>
  CATEGORY_COLOURS.map(({ name, value }) => {
    const isOn = value === selected;

    return {
      key: name,
      name,
      background: value,
      isOn,
      ring: isOn
        ? `0 0 0 2px #fff, 0 0 0 4px ${value}`
        : "inset 0 0 0 1px rgba(26,23,20,.08)",
      pick: () => onPick(value),
    };
  });

export const DURATION_HOUR_OPTIONS = Array.from(
  { length: 13 },
  (_slot, hour) => ({
    value: String(hour),
    label: hour + (hour === 1 ? " hr" : " hrs"),
  }),
);
export const DURATION_MINUTE_OPTIONS = Array.from(
  { length: 12 },
  (_slot, index) => ({
    value: String(index * 5),
    label: index * 5 + (index * 5 === 1 ? " min" : " mins"),
  }),
);

/** Manage categories: reorder, rename, recolour, delete and add. */
export const getCategoriesView = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const ui: Partial<CategoriesUi> = state.categoriesUi || {};

  const setUi = (patch: Partial<CategoriesUi>) =>
    setState(({ categoriesUi }) => ({
      categoriesUi: { ...categoriesUi, ...patch } as CategoriesUi,
    }));

  const list = getSortedCategories(state);

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

  const newError = ui.newError || "";

  return {
    isEmpty: !list.length,
    rows: list.map((category, index) => {
      const count = state.services.filter(
        ({ categoryId }) => categoryId === category.id,
      ).length;

      const isEditing = ui.editId === category.id;
      const editError = isEditing ? ui.editError || "" : "";

      const colourName =
        CATEGORY_COLOURS.find(({ value }) => value === category.colour)?.name ||
        "";

      return {
        key: category.id,
        name: category.name,
        dot: category.colour,
        meta:
          count +
          (count === 1 ? " service" : " services") +
          (colourName ? ` · ${colourName}` : ""),
        isEditing,
        moveUp: () => move(index, -1),
        down: () => move(index, 1),
        isMoveUpDisabled: index === 0,
        isMoveDownDisabled: index === list.length - 1,
        edit: () =>
          setUi({
            editId: category.id,
            editName: category.name,
            editColour: category.colour,
            editError: "",
          }),
        remove: () => {
          const addonCount = state.addons.filter(
            ({ categoryId }) => categoryId === category.id,
          ).length;

          const serviceMove = count === 1 ? " service moves" : " services move";

          const addonMove =
            addonCount === 1 ? " add-on moves" : " add-ons move";

          const addonNote = addonCount
            ? ` and ${addonCount}${addonMove} to Other add-ons`
            : "";

          setState({
            confirm: {
              title: `Delete ‘${category.name}’?`,
              body: `Its ${count}${serviceMove} to Other services${addonNote}.`,
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
                  serviceCategoryFilter:
                    current.serviceCategoryFilter === category.id
                      ? "all"
                      : current.serviceCategoryFilter,
                  addonCategoryFilter:
                    current.addonCategoryFilter === category.id
                      ? "all"
                      : current.addonCategoryFilter,
                }));

                actions.showToast(`${category.name} deleted`);
              },
            },
          });
        },
        editName: isEditing ? ui.editName || "" : "",
        onEditName: (event: ChangeEvent<HTMLInputElement>) =>
          setUi({ editName: event.target.value.slice(0, 40), editError: "" }),
        editError,
        swatches: isEditing
          ? getSwatches(ui.editColour, (value) => setUi({ editColour: value }))
          : [],
        save: () => {
          const error = getCategoryNameError(
            state,
            ui.editName || "",
            category.id,
          );

          if (error) {
            setUi({ editError: error });

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
            categoriesUi: {
              ...current.categoriesUi,
              editId: null,
            } as CategoriesUi,
          }));

          actions.showToast("Category saved");
        },
        cancel: () => setUi({ editId: null, editError: "" }),
      };
    }),
    newName: ui.newName || "",
    onNewName: (event: ChangeEvent<HTMLInputElement>) =>
      setUi({ newName: event.target.value.slice(0, 40), newError: "" }),
    newError,
    newSwatches: getSwatches(ui.newColour, (value) =>
      setUi({ newColour: value }),
    ),
    add: () => {
      const result = serviceActions.addCategory(ui.newName || "", ui.newColour);

      if (result.error !== undefined) {
        setUi({ newError: result.error });

        return;
      }

      actions.showToast(`${result.category.name} added`);

      window.setTimeout(
        () =>
          setState(({ categoriesUi, categories }) => ({
            categoriesUi: {
              ...categoriesUi,
              newName: "",
              newError: "",
              newColour: getNextCategoryColour(categories),
            } as CategoriesUi,
          })),
        0,
      );
    },
  };
};

/** Create or edit an add-on. */
export const getAddonSheetView = (studio: StudioController) => {
  const { state, setState, actions, serviceActions } = studio;
  const draft = state.sheet === "addon" ? state.addonDraft : null;

  if (!draft) return null;

  const isBad = !draft.name.trim();

  const patch = (value: Partial<typeof draft>) =>
    setState({ addonDraft: { ...draft, ...value } });

  const { addonNewCategory } = state;

  return {
    name: draft.name,
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      patch({ name: event.target.value }),
    hourValue: String(parseWholeNumber(draft.hours)),
    minuteValue: String(parseWholeNumber(draft.min)),
    price: String(draft.price),
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      patch({ price: event.target.value }),
    onHour: (event: ChangeEvent<HTMLSelectElement>) =>
      patch({ hours: event.target.value }),
    onMinute: (event: ChangeEvent<HTMLSelectElement>) =>
      patch({ min: event.target.value }),
    categoryOptions: (
      [{ label: "No category", dot: NO_CATEGORY_TONE }] as SearchSelectOption[]
    )
      .concat(
        getSortedCategories(state).map(({ name, colour }) => ({
          label: name,
          dot: colour,
        })),
      )
      .concat([{ label: "+ New category", action: true }]),
    categoryValue:
      getCategoryById(state, draft.categoryId)?.name || "No category",
    pickCategory: (label: string) => {
      if (label === "+ New category") {
        setState({
          addonNewCategory: {
            name: "",
            colour: getNextCategoryColour(state.categories),
            error: "",
          },
        });

        return;
      }

      const category = getSortedCategories(state).find(
        ({ name }) => name === label,
      );

      patch({ categoryId: category ? category.id : null });
    },
    newCategory: addonNewCategory ?? null,
    onNewCategoryName: (event: ChangeEvent<HTMLInputElement>) =>
      addonNewCategory &&
      setState({
        addonNewCategory: {
          ...addonNewCategory,
          name: event.target.value.slice(0, 40),
          error: "",
        },
      }),
    newCategorySwatches: addonNewCategory
      ? getSwatches(addonNewCategory.colour, (value) =>
          setState(({ addonNewCategory: current }) => ({
            addonNewCategory: current ? { ...current, colour: value } : current,
          })),
        )
      : [],
    addNewCategory: () => {
      if (!addonNewCategory) return;

      const result = serviceActions.addCategory(
        addonNewCategory.name,
        addonNewCategory.colour,
      );

      if (result.error !== undefined) {
        setState({
          addonNewCategory: { ...addonNewCategory, error: result.error },
        });

        return;
      }

      window.setTimeout(
        () =>
          setState(({ addonDraft }) => ({
            addonNewCategory: null,
            addonDraft: addonDraft
              ? { ...addonDraft, categoryId: result.id }
              : addonDraft,
          })),
        0,
      );
    },
    cancelNewCategory: () => setState({ addonNewCategory: null }),
    cta: draft.id ? "Save add-on" : "Create add-on",
    isDisabled: isBad,
    save: () => {
      if (isBad) return;

      const addon = {
        id: draft.id || crypto.randomUUID(),
        categoryId: getCategoryById(state, draft.categoryId)
          ? draft.categoryId
          : null,
        status: draft.status || "active",
        name: draft.name.trim(),
        price: parseNumber(draft.price),
        hours: parseWholeNumber(draft.hours),
        min: parseWholeNumber(draft.min),
      };

      setState({
        addons: draft.id
          ? state.addons.map((item) => (item.id === draft.id ? addon : item))
          : state.addons.concat([addon]),
        servicesTab: "addons",
      });

      actions.showToast(
        draft.id
          ? `${addon.name} updated`
          : `${addon.name} added to your add-ons`,
      );

      actions.closeSheet();
    },
  };
};

export type CategoriesView = ReturnType<typeof getCategoriesView>;
export type AddonSheetView = NonNullable<ReturnType<typeof getAddonSheetView>>;
