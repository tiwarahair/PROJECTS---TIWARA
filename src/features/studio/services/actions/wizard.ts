import type { StudioActions, StudioContext } from "../../core/actions";
import { findServiceType } from "../../core/model";
import type {
  StudioService,
  StudioState,
  VariationRow,
  WizardDraft,
  WizardState,
} from "../../core/types";

const getBlankDraft = (): WizardDraft => ({
  name: "",
  description: "",
  taxonomyId: null,
  subcategory: "",
  typeId: null,
  categoryId: null,
  own: [],
  price: "",
  durationHours: "",
  durationMinutes: "",
  sizesOn: false,
  lengthsOn: false,
  sizes: [],
  lengths: [],
  addons: [],
  status: "active",
  extra: "",
  photos: [],
});

const getServiceDraft = (
  service: StudioService,
  { portfolio, catalogue }: StudioState,
): WizardDraft => {
  const type = findServiceType(service, catalogue.types);

  return {
    name: service.name,
    description: service.description || "",
    taxonomyId: service.taxonomyId,
    subcategory: type ? type.name : service.subcategory || "",
    typeId: type ? type.id : null,
    categoryId: service.categoryId || null,
    own: (service.own || []).map(({ name, options }) => ({
      name,
      options: options.map((option) => ({ ...option })),
    })),
    price: `${service.price}`,
    durationHours: `${service.durationHours || 0}`,
    durationMinutes: `${service.durationMinutes || 0}`,
    sizesOn: !!service.sizesOn,
    lengthsOn: !!service.lengthsOn,
    sizes: (service.sizes || []).map((row) => ({ ...row })),
    lengths: (service.lengths || []).map((row) => ({ ...row })),
    addons: (service.addons || []).map((link) => ({ ...link })),
    status: service.status,
    extra: service.extraCustom ? String(service.extra || 0) : "",
    photos: portfolio
      .filter(({ id }) => service.photoIds?.includes(id))
      .map(({ id, src }) => ({ id, src })),
  };
};

export const createWizardActions = (
  { getState, setState }: StudioContext,
  { openSheet }: StudioActions,
) => {
  const setWizard = (patch: Partial<WizardState>) =>
    setState(({ wizard }) => ({
      wizard: wizard ? { ...wizard, ...patch } : wizard,
    }));

  const setDraft = (patch: Partial<WizardDraft>) =>
    setState(({ wizard }) => ({
      wizard: wizard
        ? { ...wizard, draft: { ...wizard.draft, ...patch } }
        : wizard,
    }));

  const setVarRow = (
    key: "sizes" | "lengths",
    index: number,
    patch: Partial<VariationRow>,
  ) => {
    const draft = getState().wizard?.draft;

    if (!draft) return;

    const list = draft[key].map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );

    setDraft(key === "sizes" ? { sizes: list } : { lengths: list });
  };

  const openWizard = (
    mode: "add" | "edit",
    service?: StudioService | null,
    preset: Partial<WizardDraft> = {},
  ) => {
    const draft = service
      ? getServiceDraft(service, getState())
      : getBlankDraft();

    openSheet("svcwiz", {
      wizard: {
        mode,
        step: 2,
        suggestionsOpen: false,
        flash: null,
        editId: service ? service.id : null,
        search: "",
        other: false,
        review: false,
        openAddon: null,
        newAddon: null,
        addonQuery: "",
        draft: { ...draft, ...preset },
      },
    });
  };

  return { setWizard, setDraft, setVarRow, openWizard };
};

export type WizardActions = ReturnType<typeof createWizardActions>;
