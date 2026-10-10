// The Add / Edit service wizard (prototype svcV in renderVals: steps, details, pricing, suggestions, footer).
import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import type { SearchSelectOption } from "../../components/search-select/search-select";
import { serviceTypes } from "../../data";
import type { ServiceType } from "../../types/service-type";
import { getSwatches } from "./catalog-sheets-view";
import { NO_CAT_TONE, TAXONOMY } from "./studio-data";
import { fmtDur, fmtMin } from "./studio-format";
import { getCatById, getCatsSorted, getNextCatColour } from "./studio-model";
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

const STEPS = [2, 3, 4];
const STEP_NAMES: Record<number, string> = {
  1: "Select a service",
  2: "Details",
  3: "Pricing",
  4: "Add-ons",
};
const SUB_TIP =
  "Select the service type that best describes this service. This helps clients discover your service";

const getHourLabel = (hours: string | number) =>
  hours + (Number(hours) === 1 ? " hr" : " hrs");
const getMinuteLabel = (minutes: string | number) =>
  minutes + (Number(minutes) === 1 ? " min" : " mins");

export const getWizardView = (studio: StudioController) => {
  const { state, setState, isWide, actions, serviceActions, context } = studio;
  const wizard = state.sheet === "svcwiz" ? state.wiz : null;
  if (!wizard) return null;
  const { setWiz, setDraft, addCategory, pickSugg } = serviceActions;
  const { draft } = wizard;
  const group = draft.cat ? getTaxonomy(draft.cat) : null;
  const stepIndex = STEPS.indexOf(wizard.step);
  const base = getWizardBase(draft);
  const isStep3Ok = base.basePrice > 0 && base.totalMinutes > 0;
  const query = (wizard.search || "").toLowerCase();
  const catFilter = wizard.catF || "all";
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
    const isSame = draft.cat === type.groupId;
    return {
      ...draft,
      cat: type.groupId,
      sub: type.name,
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
    : TAXONOMY.filter(({ id }) => catFilter === "all" || id === catFilter)
        .map(({ id, name, types }) => ({
          key: id,
          cat: name,
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
              pick: () => pickSugg(type),
            })),
        }))
        .filter(({ items }) => items.length);
  const currentCat = getCatById(state, draft.categoryId);
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
  const newCat = wizard.newCat || null;
  const sizes = draft.sizesOn ? draft.sizes || [] : [];
  const lengths = draft.lengthsOn ? draft.lengths || [] : [];
  const isVariationBad = sizes.concat(lengths).some((row) => {
    const errors = getVariationErrors(row, base);
    return errors.pErr || errors.tErr;
  });
  const review = getReview(draft, base);
  const isReviewReady =
    review.sizes.length + review.lengths.length > 0 &&
    isStep3Ok &&
    !isVariationBad;

  const save = () => {
    const service = {
      id: wizard.editId || "svc" + Date.now(),
      cat: draft.cat,
      sub: draft.sub || "",
      typeId: draft.typeId || null,
      categoryId: getCatById(state, draft.categoryId) ? draft.categoryId : null,
      own: (draft.own || []).map(({ name, options }) => ({
        name,
        options: options.map((option) => ({ ...option })),
      })),
      name: draft.name.trim(),
      desc: draft.desc,
      price: base.basePrice,
      durH: base.baseHours,
      durM: base.baseMinutes,
      dur: fmtDur(base.baseHours, base.baseMinutes),
      extraCustom: String(draft.extra || "") !== "",
      extra:
        String(draft.extra || "") === ""
          ? state.rules.extra || 0
          : parseInt(draft.extra) || 0,
      st: draft.st && draft.st !== "draft" ? draft.st : "active",
      sizesOn: draft.sizesOn,
      lengthsOn: draft.lengthsOn,
      sizes: draft.sizes,
      lengths: draft.lengths,
      addons: draft.addons,
    };
    const keepNew = (wizard.pendAddons || []).filter(({ id }) =>
      draft.addons.some(({ aid }) => aid === id),
    );
    setState({
      services: wizard.editId
        ? state.services.map((item) =>
            item.id === wizard.editId ? service : item,
          )
        : state.services.concat([service]),
      addons: state.addons.concat(keepNew),
      svcTab: "services",
    });
    actions.toastMsg(
      wizard.mode === "add"
        ? service.name + " added to your services"
        : service.name + " updated",
    );
    actions.closeSheet();
    actions.checkDone();
  };

  const isDisabled =
    wizard.mode === "edit"
      ? !(
          draft.name.trim() &&
          draft.cat &&
          draft.typeId &&
          isStep3Ok &&
          !isVariationBad
        )
      : wizard.step === 1
        ? true
        : wizard.step === 2
          ? !(draft.name.trim() && draft.cat && draft.typeId)
          : wizard.step === 3 && !wizard.review
            ? !(isStep3Ok && !isVariationBad)
            : false;

  const flash = wizard.flash || {};
  const durHourValue = String(draft.durH == null ? "" : draft.durH);
  const durMinuteValue = String(draft.durM == null ? "" : draft.durM);
  const hourOptions = Array.from({ length: 13 }, (_, hour) => ({
    v: String(hour),
    label: getHourLabel(hour),
  }));
  const minuteOptions = Array.from({ length: 12 }, (_, index) => ({
    v: String(index * 5),
    label: getMinuteLabel(index * 5),
  }));
  if (durHourValue !== "" && !hourOptions.some(({ v }) => v === durHourValue))
    hourOptions.unshift({ v: durHourValue, label: getHourLabel(durHourValue) });
  if (
    durMinuteValue !== "" &&
    !minuteOptions.some(({ v }) => v === durMinuteValue)
  )
    minuteOptions.push({
      v: durMinuteValue,
      label: getMinuteLabel(durMinuteValue),
    });
  const defaultExtra = state.rules.extra || 0;
  const rawExtra = draft.extra == null ? "" : String(draft.extra);
  const isExtraTyped = rawExtra !== "";
  const extraMinutes = [0, 5, 10, 15, 20, 25, 30];

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
      pick: () => setWiz({ step, review: false }),
    })),
    isPricing: wizard.step === 3 && !wizard.review,
    isReview: wizard.step === 3 && wizard.review,
    dots: STEPS.map((step, index) => ({ key: step, isOn: index <= stepIndex })),
    stepLabel: "Step " + (stepIndex + 1) + " of " + STEPS.length + " · ",
    stepName:
      wizard.step === 3 && wizard.review
        ? "Review prices"
        : STEP_NAMES[wizard.step],
    // suggestions dialog
    search: wizard.search,
    onSearch: (event: ChangeEvent<HTMLInputElement>) =>
      setWiz({ search: event.target.value }),
    isSearching: !!query,
    clearSearch: () => setWiz({ search: "" }),
    catChips: [{ id: "all", label: "All" }]
      .concat(TAXONOMY.map(({ id, name }) => ({ id, label: name })))
      .map(({ id, label }) => ({
        key: id,
        label,
        isOn: catFilter === id,
        pick: () => setWiz({ catF: id }),
      })),
    catalogue,
    hasNoResults: catalogue.length === 0,
    isSuggOpen: !!wizard.sugg,
    openSugg: () =>
      setWiz({ sugg: true, search: "", catF: "all", pickGroup: false }),
    closeSugg: () => setWiz({ sugg: false }),
    suggKey: (event: { key: string; stopPropagation: () => void }) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setWiz({ sugg: false });
      }
    },
    flash: {
      name: !!flash.name,
      desc: !!flash.desc,
      type: !!flash.type,
      price: !!flash.price,
      opts: !!flash.opts,
    },
    // details
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
    catValue: currentCat ? currentCat.name : "No category",
    pickCat: (label: string) => {
      if (label === "+ New category") {
        setWiz({
          newCat: {
            name: "",
            colour: getNextCatColour(state.categories),
            err: "",
          },
        });
        return;
      }
      const category = getCatsSorted(state).find(({ name }) => name === label);
      setDraft({ categoryId: category ? category.id : null });
    },
    newCat,
    onNewCatName: (event: ChangeEvent<HTMLInputElement>) =>
      newCat &&
      setWiz({
        newCat: { ...newCat, name: event.target.value.slice(0, 40), err: "" },
      }),
    newCatSwatches: newCat
      ? getSwatches(newCat.colour, (value) =>
          setWiz({ newCat: { ...newCat, colour: value } }),
        )
      : [],
    addNewCat: () => {
      if (!newCat) return;
      const result = addCategory(newCat.name, newCat.colour);
      if (result.err !== undefined) {
        setWiz({ newCat: { ...newCat, err: result.err } });
        return;
      }
      window.setTimeout(() => {
        const current = context.getState().wiz;
        if (current)
          setState({
            wiz: {
              ...current,
              newCat: null,
              draft: { ...current.draft, categoryId: result.id },
            },
          });
      }, 0);
    },
    cancelNewCat: () => setWiz({ newCat: null }),
    typeOptions,
    typeValue: currentType ? currentType.name : "",
    pickType: (label: string) => {
      const type = serviceTypes.find(({ name }) => name === label);
      if (type) setDraft(applyType(type));
    },
    isSubTipOpen: !!wizard.subTip,
    toggleSubTip: () => {
      if (actions.isTouch()) setWiz({ subTip: !wizard.subTip });
    },
    subTipIn: (event: MouseEvent | FocusEvent) =>
      actions.tipShow(
        event as unknown as { currentTarget: Element },
        "subtype",
        SUB_TIP,
        true,
      ),
    tipOut: () => actions.tipHide(),
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
      actions.toastMsg("Image upload is not part of this prototype"),
    onName: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ name: event.target.value }),
    onDesc: (event: ChangeEvent<HTMLTextAreaElement>) =>
      setDraft({ desc: event.target.value }),
    // pricing
    onPrice: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ price: event.target.value }),
    onDurHours: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ durH: event.target.value }),
    onDurMinutes: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ durM: event.target.value }),
    priceWidth:
      String(draft.price == null ? "" : draft.price).length * 8 + 14 + "px",
    durHourValue: durHourValue === "" ? "0" : durHourValue,
    durMinuteValue: durMinuteValue === "" ? "0" : durMinuteValue,
    hourOptions,
    minuteOptions,
    extraValue: rawExtra,
    onExtra: (event: ChangeEvent<HTMLSelectElement>) =>
      setDraft({ extra: event.target.value }),
    isExtraTyped,
    extraOptions: [
      {
        v: "",
        label: defaultExtra
          ? "Default (" + defaultExtra + " min)"
          : "None selected",
      },
    ].concat(
      extraMinutes.map((minutes) => ({
        v: String(minutes),
        label: minutes + " min",
      })),
    ),
    extraOptionsShort: [
      { v: "", label: defaultExtra ? "+" + defaultExtra + "m" : "+ min" },
    ].concat(
      extraMinutes.map((minutes) => ({
        v: String(minutes),
        label: "+" + minutes + "m",
      })),
    ),
    isExtraOverride: !!defaultExtra && isExtraTyped,
    extraHelp: "Overrides your default (" + fmtMin(defaultExtra) + ").",
    hasSizes: !!group?.sizes,
    hasLengths: !!group?.lengths,
    hasPlatform: !!(group && (group.sizes || group.lengths)),
    isPricingCollapsed: !!(draft.sizesOn || draft.lengthsOn),
    toggleSizes: () => {
      const isOn = !draft.sizesOn;
      let rows =
        draft.sizes && draft.sizes.length
          ? draft.sizes
          : group?.sizes
            ? makeVariationRows(group.sizes)
            : [];
      if (isOn && rows.length && !rows.some(({ on }) => on))
        rows = rows.map((row, index) =>
          index === 0
            ? { ...row, on: true, neg: false, dp: "0", dh: "0", dm: "0" }
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
    sizeHead: draft.cat === "locs" ? "Size" : "Size / thickness",
    sizeRows: getVariationRows(studio, "sizes", draft.sizes || [], base),
    lengthRows: getVariationRows(studio, "lengths", draft.lengths || [], base),
    own: getOwnEditor(studio, wizard, base),
    isReviewShown: !!(draft.sizesOn || draft.lengthsOn),
    isReviewReady,
    openReview: () => {
      if (isReviewReady) setWiz({ review: true });
    },
    review,
    // add-ons
    addons: getWizardAddons(studio, wizard),
    // footer
    canBack: wizard.review || (wizard.mode === "add" && stepIndex > 0),
    back: () => {
      if (wizard.review) {
        setWiz({ review: false });
        return;
      }
      if (stepIndex > 0)
        setWiz({ step: STEPS[stepIndex - 1] as number, review: false });
    },
    next: () => {
      if (isDisabled) return;
      if (wizard.mode === "edit") {
        save();
        return;
      }
      if (wizard.review) {
        setWiz({ review: false, step: 4 });
        return;
      }
      if (stepIndex < STEPS.length - 1) {
        setWiz({ step: STEPS[stepIndex + 1] as number });
        return;
      }
      save();
    },
    isDisabled,
    cta:
      wizard.mode === "edit"
        ? "Save service"
        : stepIndex === STEPS.length - 1
          ? "Add service"
          : "Continue",
    isWide,
  };
};

export type WizardView = NonNullable<ReturnType<typeof getWizardView>>;
