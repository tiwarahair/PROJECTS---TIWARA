import type { ServiceType } from "../../../../types/catalogue";
import type { StudioActions, StudioContext } from "../../core/actions";
import { getCategoryById } from "../../core/model";
import type { StudioState, WizardDraft, WizardState } from "../../core/types";
import { getSuggestionFill } from "./suggestion-fill";
import type { SuggestionFill } from "./suggestion-fill";
import type { WizardActions } from "./wizard";

const isEmpty = (value: string) => !value.trim();

const getAddonLinks = (
  state: StudioState,
  wizard: WizardState,
  fill: SuggestionFill,
) => {
  const pending = (wizard.pendingAddons || []).slice();
  const addons = state.addons.concat(pending);
  const links: WizardDraft["addons"] = [];

  fill.addonDefinitions.forEach(({ name, price, minutes }) => {
    let addon = addons.find(
      (item) =>
        (item.status || "active") !== "archived" &&
        String(item.name).toLowerCase() === name.toLowerCase(),
    );

    if (!addon) {
      addon = {
        id: crypto.randomUUID(),
        categoryId: getCategoryById(state, wizard.draft.categoryId)
          ? wizard.draft.categoryId
          : null,
        name,
        price,
        hours: Math.floor(minutes / 60),
        min: minutes % 60,
        status: "active",
      };

      addons.push(addon);
      pending.push(addon);
    }

    links.push({
      addonId: addon.id,
      priceOverride: null,
      hoursOverride: null,
      minutesOverride: null,
    });
  });

  return { pending, links };
};

const getFillPatch = (
  draft: WizardDraft,
  fill: SuggestionFill,
  links: WizardDraft["addons"],
  isReplace: boolean,
) => {
  const patch: Partial<WizardDraft> = {};
  const flash: Record<string, number> = {};

  const put = <K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K],
    flashKey?: string,
  ) => {
    patch[key] = value;

    if (flashKey) flash[flashKey] = 1;
  };

  if (isReplace || isEmpty(draft.name)) put("name", fill.name, "name");

  if ((isReplace || isEmpty(draft.description)) && fill.description)
    put("description", fill.description, "description");

  if (isReplace || !draft.typeId) {
    put("taxonomyId", fill.taxonomyId);
    put("subcategory", fill.subcategory);
    put("typeId", fill.typeId, "type");
  }

  if (isReplace || isEmpty(draft.price)) put("price", fill.price, "price");

  if (
    isReplace ||
    (!parseInt(draft.durationHours) && !parseInt(draft.durationMinutes))
  ) {
    put("durationHours", fill.durationHours, "price");
    put("durationMinutes", fill.durationMinutes);
  }

  if (
    isReplace ||
    !(draft.sizesOn || draft.lengthsOn) ||
    (patch.taxonomyId && patch.taxonomyId !== draft.taxonomyId)
  ) {
    put("sizesOn", fill.sizesOn);
    put("lengthsOn", fill.lengthsOn);
    put("sizes", fill.sizes);
    put("lengths", fill.lengths);

    if (fill.sizesOn) flash.options = 1;
  }

  if (isReplace || !draft.addons.length) {
    const keep = isReplace ? [] : draft.addons;

    put(
      "addons",
      keep.concat(
        links.filter(
          (link) => !keep.some(({ addonId }) => addonId === link.addonId),
        ),
      ),
    );
  }

  return { patch, flash };
};

const hasEntries = (draft: WizardDraft) =>
  !!(
    String(draft.name || "").trim() ||
    String(draft.description || "").trim() ||
    draft.typeId ||
    String(draft.price || "").trim() ||
    parseInt(draft.durationHours) ||
    parseInt(draft.durationMinutes) ||
    draft.sizesOn ||
    draft.lengthsOn
  );

export const createSuggestionActions = (
  { getState, setState, timers, isWide }: StudioContext,
  { showToast }: StudioActions,
  { setWizard }: WizardActions,
) => {
  const applySuggestion = (
    type: ServiceType,
    isReplace: boolean,
    isHeld?: boolean,
  ) => {
    const state = getState();
    const wizard = state.wizard;

    if (!wizard) return;

    const draft = wizard.draft;
    const fill = getSuggestionFill(type, state.catalogue);
    const { pending, links } = getAddonLinks(state, wizard, fill);
    const { patch, flash } = getFillPatch(draft, fill, links, isReplace);

    setState({
      wizard: {
        ...wizard,
        suggestionsOpen: false,
        flash,
        pendingAddons: pending,
        draft: { ...draft, ...patch },
      },
    });

    showToast(
      isWide()
        ? `Filled in from ${type.name}. Check and edit anything you need.`
        : `Filled in from ${type.name}`,
    );

    window.clearTimeout(timers.flash);

    if (!isHeld)
      timers.flash = window.setTimeout(() => {
        if (getState().wizard) setWizard({ flash: null });
      }, 1100);
  };

  const pickSuggestion = (type: ServiceType) => {
    const draft = getState().wizard?.draft;

    if (!draft) return;

    setWizard({ suggestionsOpen: false });

    if (!hasEntries(draft)) {
      applySuggestion(type, true);

      return;
    }

    window.setTimeout(
      () =>
        setState({
          confirm: {
            title: "Replace what you’ve entered?",
            body: `We’ll fill in the name, description, service type, price, time and options from ${type.name}.`,
            yesLabel: "Replace",
            noLabel: "Keep mine",
            yes: () => {
              setState({ confirm: null });
              applySuggestion(type, true);
            },
            onNo: () => {
              setState({ confirm: null });
              applySuggestion(type, false);
            },
          },
        }),
      180,
    );
  };

  return { getSuggestionFill, applySuggestion, pickSuggestion };
};
