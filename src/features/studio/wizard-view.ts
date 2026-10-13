// The Add / Edit service wizard: steps, details, pricing, suggestions, footer.
import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import type { SearchSelectOption } from "../../components/search-select/search-select";
import { serviceTypes } from "../../data";
import type { ServiceType } from "../../types/service-type";
import { getSwatches } from "./catalog-sheets-view";
import { NO_CATEGORY_TONE, TAXONOMY } from "./studio-data";
import { formatMinutes } from "./studio-format";
import {
  getCategoryById,
  getSortedCategories,
  getNextCategoryColour,
} from "./studio-model";
import { getTaxonomy, makeVariationRows } from "./studio-service-actions";
import type { WizardDraft } from "./studio-types";
import type { StudioController } from "./use-studio";
import {
  getOwnEditor,
  getReview,
  getVariationErrors,
  getVariationRows,
  getWizardAddons,
  getWizardBase,
} from "./wizard-options-view";
import { formatDuration } from "../../utils/dates";

const STEPS = [2, 3, 4];

const STEP_NAMES: Record<number, string> = {
  1: "Select a service",
  2: "Details",
  3: "Pricing",
  4: "Add-ons",
};

const SUBCATEGORY_TIP =
  "Select the service type that best describes this service. This helps clients discover your service";

const getHourLabel = (hours: string | number) =>
  hours + (Number(hours) === 1 ? " hr" : " hrs");

const getMinuteLabel = (minutes: string | number) =>
  minutes + (Number(minutes) === 1 ? " min" : " mins");

export const getWizardView = (studio: StudioController) => {
  const { state, setState, isWide, actions, serviceActions, context } = studio;
  const wizard = state.sheet === "svcwiz" ? state.wizard : null;

  if (!wizard) return null;

  const { setWizard, setDraft, addCategory, pickSuggestion } = serviceActions;
  const { draft } = wizard;
  const group = draft.taxonomyId ? getTaxonomy(draft.taxonomyId) : null;
  const stepIndex = STEPS.indexOf(wizard.step);
  const base = getWizardBase(draft);
  const isStep3Valid = base.basePrice > 0 && base.totalMinutes > 0;
  const query = (wizard.search || "").toLowerCase();
  const categoryFilter = wizard.categoryFilter || "all";

  const isTypeHit = ({ name, synonyms }: ServiceType) =>
    !query ||
    name.toLowerCase().includes(query) ||
    (synonyms || []).some(
      (word) =>
        word.toLowerCase().includes(query) ||
        query.includes(word.toLowerCase()),
    );

  const applyType = (type: ServiceType, extra: Partial<WizardDraft> = {}) => {
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
      ...extra,
    };
  };

  const catalogue = wizard.pickGroup
    ? []
    : TAXONOMY.filter(
        ({ id }) => categoryFilter === "all" || id === categoryFilter,
      )
        .map(({ id, name, types }) => ({
          key: id,
          category: name,
          items: types
            .filter(
              (type) =>
                !type.isOther &&
                (isTypeHit(type) ||
                  (!!query && name.toLowerCase().includes(query))),
            )
            .map((type) => ({
              key: type.id,
              name: type.name,
              pick: () => pickSuggestion(type),
            })),
        }))
        .filter(({ items }) => items.length);

  const currentCategory = getCategoryById(state, draft.categoryId);
  const typeOptions: SearchSelectOption[] = [];

  TAXONOMY.forEach(({ name, types }) =>
    types.forEach((type) =>
      typeOptions.push({
        label: type.name,
        group: name,
        keywords: (type.synonyms || []).concat([name]),
      }),
    ),
  );

  const currentType = draft.typeId
    ? serviceTypes.find(({ id }) => id === draft.typeId)
    : null;

  const newCategory = wizard.newCategory || null;
  const sizes = draft.sizesOn ? draft.sizes || [] : [];
  const lengths = draft.lengthsOn ? draft.lengths || [] : [];

  const isVariationBad = sizes.concat(lengths).some((row) => {
    const errors = getVariationErrors(row, base);

    return errors.priceError || errors.timeError;
  });

  const review = getReview(draft, base);

  const isReviewReady =
    review.sizes.length + review.lengths.length > 0 &&
    isStep3Valid &&
    !isVariationBad;

  const save = () => {
    const service = {
      id: wizard.editId || crypto.randomUUID(),
      taxonomyId: draft.taxonomyId,
      subcategory: draft.subcategory || "",
      typeId: draft.typeId || null,
      categoryId: getCategoryById(state, draft.categoryId)
        ? draft.categoryId
        : null,
      own: (draft.own || []).map(({ name, options }) => ({
        name,
        options: options.map((option) => ({ ...option })),
      })),
      name: draft.name.trim(),
      description: draft.description,
      price: base.basePrice,
      durationHours: base.baseHours,
      durationMinutes: base.baseMinutes,
      duration: formatDuration(base.totalMinutes),
      extraCustom: String(draft.extra || "") !== "",
      extra:
        String(draft.extra || "") === ""
          ? state.rules.extra || 0
          : parseInt(draft.extra) || 0,
      status:
        draft.status && draft.status !== "draft" ? draft.status : "active",
      sizesOn: draft.sizesOn,
      lengthsOn: draft.lengthsOn,
      sizes: draft.sizes,
      lengths: draft.lengths,
      addons: draft.addons,
    };

    const keepNew = (wizard.pendingAddons || []).filter(({ id }) =>
      draft.addons.some(({ addonId }) => addonId === id),
    );

    setState({
      services: wizard.editId
        ? state.services.map((item) =>
            item.id === wizard.editId ? service : item,
          )
        : state.services.concat([service]),
      addons: state.addons.concat(keepNew),
      servicesTab: "services",
    });

    actions.showToast(
      wizard.mode === "add"
        ? `${service.name} added to your services`
        : `${service.name} updated`,
    );

    actions.closeSheet();
    actions.checkDone();
  };

  const getIsDisabled = () => {
    if (wizard.mode === "edit")
      return !(
        draft.name.trim() &&
        draft.taxonomyId &&
        draft.typeId &&
        isStep3Valid &&
        !isVariationBad
      );

    if (wizard.step === 1) return true;

    if (wizard.step === 2)
      return !(draft.name.trim() && draft.taxonomyId && draft.typeId);

    if (wizard.step === 3 && !wizard.review)
      return !(isStep3Valid && !isVariationBad);

    return false;
  };

  const isDisabled = getIsDisabled();

  const flash = wizard.flash || {};

  const durationHourValue = String(
    draft.durationHours == null ? "" : draft.durationHours,
  );

  const durationMinuteValue = String(
    draft.durationMinutes == null ? "" : draft.durationMinutes,
  );

  const hourOptions = Array.from({ length: 13 }, (_slot, hour) => ({
    value: String(hour),
    label: getHourLabel(hour),
  }));

  const minuteOptions = Array.from({ length: 12 }, (_slot, index) => ({
    value: String(index * 5),
    label: getMinuteLabel(index * 5),
  }));

  if (
    durationHourValue !== "" &&
    !hourOptions.some(({ value }) => value === durationHourValue)
  )
    hourOptions.unshift({
      value: durationHourValue,
      label: getHourLabel(durationHourValue),
    });

  if (
    durationMinuteValue !== "" &&
    !minuteOptions.some(({ value }) => value === durationMinuteValue)
  )
    minuteOptions.push({
      value: durationMinuteValue,
      label: getMinuteLabel(durationMinuteValue),
    });

  const defaultExtra = state.rules.extra || 0;
  const rawExtra = draft.extra == null ? "" : String(draft.extra);
  const isExtraTyped = rawExtra !== "";
  const extraMinutes = [0, 5, 10, 15, 20, 25, 30];

  const getCta = () => {
    if (wizard.mode === "edit") return "Save service";

    return stepIndex === STEPS.length - 1 ? "Add service" : "Continue";
  };

  return {
    wizard,
    draft,
    isAdd: wizard.mode === "add",
    isEdit: wizard.mode === "edit",
    isStep2: wizard.step === 2,
    isStep3: wizard.step === 3,
    isStep4: wizard.step === 4,
    tabs: [
      { label: "Details", step: 2 },
      { label: "Pricing", step: 3 },
      { label: "Add-ons", step: 4 },
    ].map(({ label, step }) => ({
      key: step,
      label,
      isOn: wizard.step === step,
      pick: () => setWizard({ step, review: false }),
    })),
    isPricing: wizard.step === 3 && !wizard.review,
    isReview: wizard.step === 3 && wizard.review,
    dots: STEPS.map((step, index) => ({ key: step, isOn: index <= stepIndex })),
    stepLabel: `Step ${stepIndex + 1} of ${STEPS.length} · `,
    stepName:
      wizard.step === 3 && wizard.review
        ? "Review prices"
        : STEP_NAMES[wizard.step],
    // suggestions dialog
    search: wizard.search,
    onSearch: (event: ChangeEvent<HTMLInputElement>) =>
      setWizard({ search: event.target.value }),
    isSearching: !!query,
    clearSearch: () => setWizard({ search: "" }),
    categoryChips: [{ id: "all", label: "All" }]
      .concat(TAXONOMY.map(({ id, name }) => ({ id, label: name })))
      .map(({ id, label }) => ({
        key: id,
        label,
        isOn: categoryFilter === id,
        pick: () => setWizard({ categoryFilter: id }),
      })),
    catalogue,
    hasNoResults: catalogue.length === 0,
    isSuggestionsOpen: !!wizard.suggestionsOpen,
    openSuggestions: () =>
      setWizard({
        suggestionsOpen: true,
        search: "",
        categoryFilter: "all",
        pickGroup: false,
      }),
    closeSuggestions: () => setWizard({ suggestionsOpen: false }),
    suggestionKey: (event: { key: string; stopPropagation: () => void }) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setWizard({ suggestionsOpen: false });
      }
    },
    flash: {
      name: !!flash.name,
      description: !!flash.description,
      type: !!flash.type,
      price: !!flash.price,
      options: !!flash.options,
    },
    // details
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
    categoryValue: currentCategory ? currentCategory.name : "No category",
    pickCategory: (label: string) => {
      if (label === "+ New category") {
        setWizard({
          newCategory: {
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

      const result = addCategory(newCategory.name, newCategory.colour);

      if (result.error !== undefined) {
        setWizard({ newCategory: { ...newCategory, error: result.error } });

        return;
      }

      window.setTimeout(() => {
        const current = context.getState().wizard;

        if (current)
          setState({
            wizard: {
              ...current,
              newCategory: null,
              draft: { ...current.draft, categoryId: result.id },
            },
          });
      }, 0);
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
    // pricing
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ price: event.target.value }),
    onDurationHours: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ durationHours: event.target.value }),
    onDurationMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ durationMinutes: event.target.value }),
    priceWidth: `${String(draft.price == null ? "" : draft.price).length * 8 + 14}px`,
    durationHourValue: durationHourValue === "" ? "0" : durationHourValue,
    durationMinuteValue: durationMinuteValue === "" ? "0" : durationMinuteValue,
    hourOptions,
    minuteOptions,
    extraValue: rawExtra,
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ extra: event.target.value }),
    isExtraTyped,
    extraOptions: [
      {
        value: "",
        label: defaultExtra ? `Default (${defaultExtra} min)` : "None selected",
      },
    ].concat(
      extraMinutes.map((minutes) => ({
        value: String(minutes),
        label: `${minutes} min`,
      })),
    ),
    extraOptionsShort: [
      { value: "", label: defaultExtra ? `+${defaultExtra}m` : "+ min" },
    ].concat(
      extraMinutes.map((minutes) => ({
        value: String(minutes),
        label: `+${minutes}m`,
      })),
    ),
    isExtraOverride: !!defaultExtra && isExtraTyped,
    extraHelp: `Overrides your default (${formatMinutes(defaultExtra)}).`,
    hasSizes: !!group?.sizes,
    hasLengths: !!group?.lengths,
    hasPlatform: !!(group && (group.sizes || group.lengths)),
    isPricingCollapsed: !!(draft.sizesOn || draft.lengthsOn),
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
    own: getOwnEditor(studio, wizard, base),
    isReviewShown: !!(draft.sizesOn || draft.lengthsOn),
    isReviewReady,
    openReview: () => {
      if (isReviewReady) setWizard({ review: true });
    },
    review,
    // add-ons
    addons: getWizardAddons(studio, wizard),
    // footer
    canBack: wizard.review || (wizard.mode === "add" && stepIndex > 0),
    back: () => {
      if (wizard.review) {
        setWizard({ review: false });

        return;
      }

      if (stepIndex > 0)
        setWizard({ step: STEPS[stepIndex - 1] as number, review: false });
    },
    next: () => {
      if (isDisabled) return;

      if (wizard.mode === "edit") {
        save();

        return;
      }

      if (wizard.review) {
        setWizard({ review: false, step: 4 });

        return;
      }

      if (stepIndex < STEPS.length - 1) {
        setWizard({ step: STEPS[stepIndex + 1] as number });

        return;
      }

      save();
    },
    isDisabled,
    cta: getCta(),
    isWide,
  };
};

export type WizardView = NonNullable<ReturnType<typeof getWizardView>>;
