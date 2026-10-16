import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import type { SearchSelectOption } from "../../../../components/search-select/search-select";
import { serviceTypes } from "../../../../data";
import type { ServiceType } from "../../../../types/service-type";
import { getSwatches } from "../catalog-sheets-view";
import { NO_CATEGORY_TONE, TAXONOMY } from "../../core/constants";
import {
  getCategoryById,
  getSortedCategories,
  getNextCategoryColour,
} from "../../core/model";
import { getTaxonomy, makeVariationRows } from "../actions";
import type { WizardContext } from "./context";
import { setLatestWizard } from "./context";

const SUBCATEGORY_TIP =
  "Select the service type that best describes this service. This helps clients discover your service";

const NEW_CATEGORY = "+ New category";

const typeOptions: SearchSelectOption[] = TAXONOMY.flatMap(({ name, types }) =>
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
    const typeGroup = getTaxonomy(type.groupId);
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
    ? serviceTypes.find(({ id }) => id === draft.typeId)
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
    typeOptions,
    typeValue: currentType ? currentType.name : "",
    pickType: (label: string) => {
      const type = serviceTypes.find(({ name }) => name === label);

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
    pickImages: () =>
      actions.showToast("Image upload is not part of this prototype"),
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ name: event.target.value }),
    onDescription: (event: ChangeEvent<HTMLTextAreaElement>) =>
      setDraft({ description: event.target.value }),
  };
};
