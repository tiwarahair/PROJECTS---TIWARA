import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import type { SearchSelectOption } from "../../../../components/search-select";
import type { ServiceType } from "../../../../types/catalogue";
import { getSwatches } from "../catalog-sheets-view";
import {
  NO_CATEGORY_TONE,
  PORTFOLIO_LIMIT,
  SERVICE_PHOTO_LIMIT,
} from "../../core/constants";
import {
  getCategoryById,
  getSortedCategories,
  getNextCategoryColour,
  getTaxonomies,
  getTaxonomy,
} from "../../core/model";
import type { StudioState } from "../../core/types";
import { makeVariationRows } from "../actions";
import type { WizardContext } from "./context";
import { setLatestWizard } from "./context";

const SUBCATEGORY_TIP =
  "Select the service type that best describes this service. This helps clients discover your service";

const NEW_CATEGORY = "+ New category";

const getTypeOptions = (state: StudioState): SearchSelectOption[] =>
  getTaxonomies(state).flatMap(({ name, types }) =>
    types.map((type) => ({
      label: type.name,
      group: name,
      keywords: (type.synonyms || []).concat([name]),
    })),
  );

export const getDetailsView = ({
  studio,
  state,
  actions,
  serviceActions,
  wizard,
  draft,
  setWizard,
  setDraft,
}: WizardContext) => {
  const applyType = (type: ServiceType) => {
    const typeGroup = getTaxonomy(state, type.groupId);
    const isSame = draft.taxonomyId === type.groupId;

    return {
      ...draft,
      taxonomyId: type.groupId,
      subcategory: type.name,
      typeId: type.id,
      ...(isSame
        ? {}
        : {
            sizesOn: false,
            lengthsOn: false,
            sizes: typeGroup?.sizes ? makeVariationRows(typeGroup.sizes) : [],
            lengths: typeGroup?.lengths
              ? makeVariationRows(typeGroup.lengths)
              : [],
            addons: [],
          }),
    };
  };

  const currentCategory = getCategoryById(state, draft.categoryId);
  const sortedCategories = getSortedCategories(state);

  const currentType = draft.typeId
    ? state.catalogue.types.find(({ id }) => id === draft.typeId)
    : null;

  const newCategory = wizard.newCategory || null;
  const flash = wizard.flash || {};

  return {
    flash: {
      name: !!flash.name,
      description: !!flash.description,
      type: !!flash.type,
      price: !!flash.price,
      options: !!flash.options,
    },
    categoryOptions: (
      [{ label: "No category", dot: NO_CATEGORY_TONE }] as SearchSelectOption[]
    )
      .concat(
        sortedCategories.map(({ name, colour }) => ({
          label: name,
          dot: colour,
        })),
      )
      .concat([{ label: NEW_CATEGORY, action: true }]),
    categoryValue: currentCategory ? currentCategory.name : "No category",
    pickCategory: (label: string) => {
      if (label === NEW_CATEGORY) {
        setWizard({
          newCategory: {
            name: "",
            colour: getNextCategoryColour(state.categories),
            error: "",
          },
        });

        return;
      }

      const category = sortedCategories.find(({ name }) => name === label);

      setDraft({ categoryId: category ? category.id : null });
    },
    newCategory,
    onNewCategoryName: (event: ChangeEvent<HTMLInputElement>) =>
      newCategory &&
      setWizard({
        newCategory: {
          ...newCategory,
          name: event.target.value.slice(0, 40),
          error: "",
        },
      }),
    newCategorySwatches: newCategory
      ? getSwatches(newCategory.colour, (value) =>
          setWizard({ newCategory: { ...newCategory, colour: value } }),
        )
      : [],
    addNewCategory: () => {
      if (!newCategory) return;

      const result = serviceActions.addCategory(
        newCategory.name,
        newCategory.colour,
      );

      if (result.error !== undefined) {
        setWizard({ newCategory: { ...newCategory, error: result.error } });

        return;
      }

      window.setTimeout(
        () =>
          setLatestWizard(
            studio,
            { newCategory: null },
            { categoryId: result.id },
          ),
        0,
      );
    },
    cancelNewCategory: () => setWizard({ newCategory: null }),
    typeOptions: getTypeOptions(state),
    typeValue: currentType ? currentType.name : "",
    pickType: (label: string) => {
      const type = state.catalogue.types.find(
        ({ name, isActive }) => isActive && name === label,
      );

      if (type) setDraft(applyType(type));
    },
    isSubcategoryTipOpen: !!wizard.subcategoryTipOpen,
    toggleSubcategoryTip: () => {
      if (actions.isTouch())
        setWizard({ subcategoryTipOpen: !wizard.subcategoryTipOpen });
    },
    showSubcategoryTip: (event: MouseEvent | FocusEvent) =>
      actions.tipShow(event, "subtype", SUBCATEGORY_TIP, true),
    hideSubcategoryTip: () => actions.tipHide(),
    selectAll: (event: FocusEvent<HTMLInputElement>) => {
      const target = event.target;

      window.setTimeout(() => {
        try {
          target.select();
        } catch {
          // the input may have gone
        }
      }, 0);
    },
    photos: draft.photos.map(({ id, src, file }) => ({
      key: id,
      src,
      remove: () => {
        if (file) URL.revokeObjectURL(src);

        setDraft({ photos: draft.photos.filter((photo) => photo.id !== id) });
      },
    })),
    canAddPhotos: draft.photos.length < SERVICE_PHOTO_LIMIT,
    onImageFiles: (event: ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(event.target.files || []);
      const unsaved = draft.photos.filter(({ file }) => file).length;
      const portfolioRoom = PORTFOLIO_LIMIT - state.portfolio.length - unsaved;

      const room = Math.min(
        SERVICE_PHOTO_LIMIT - draft.photos.length,
        portfolioRoom,
      );

      event.target.value = "";

      if (picked.length && portfolioRoom <= 0)
        actions.showToast(
          `Your portfolio is full (${PORTFOLIO_LIMIT} photos). Remove some in Settings to add more.`,
        );

      setDraft({
        photos: draft.photos.concat(
          picked.slice(0, Math.max(room, 0)).map((file) => ({
            id: crypto.randomUUID(),
            src: URL.createObjectURL(file),
            file,
          })),
        ),
      });
    },
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ name: event.target.value }),
    onDescription: (event: ChangeEvent<HTMLTextAreaElement>) =>
      setDraft({ description: event.target.value }),
  };
};
