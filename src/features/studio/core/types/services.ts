import type { ServiceType } from "../../../../types/service-type";

export interface VariationRow {
  label: string;
  on: boolean;
  negative?: boolean;
  priceDelta: string;
  hoursDelta: string;
  minutesDelta: string;
}

export interface OwnOption {
  label: string;
  negative?: boolean;
  priceDelta: string;
  minutesDelta: string;
}

export interface OwnGroup {
  name: string;
  options: OwnOption[];
}

interface ServiceAddonLink {
  addonId: string;
  priceOverride: string | number | null;
  hoursOverride: string | number | null;
  minutesOverride: string | number | null;
}

export interface StudioService {
  id: string;
  taxonomyId: string | null;
  subcategory: string;
  typeId?: string | null;
  categoryId: string | null;
  own?: OwnGroup[];
  name: string;
  description: string;
  price: number;
  durationHours: number;
  durationMinutes: number;
  duration: string;
  extra?: number;
  extraCustom?: boolean;
  status: string;
  sizesOn: boolean;
  lengthsOn: boolean;
  sizes: VariationRow[];
  lengths: VariationRow[];
  addons: ServiceAddonLink[];
  photoIds?: string[];
}

export interface StudioAddon {
  id: string;
  taxonomyId?: string;
  categoryId: string | null;
  name: string;
  price: number | string;
  hours: number | string;
  min: number | string;
  status?: string;
}

export interface StudioCategory {
  id: string;
  name: string;
  sort: number;
  colour: string;
}

export interface CategoryDraft {
  name: string;
  colour: string;
  error: string;
}

export interface CategoriesUi {
  newName: string;
  newColour: string;
  newError: string;
  editId: string | null;
  editName: string;
  editColour: string | null;
  editError: string;
}

interface AddonQuickDraft {
  name: string;
  price: string;
  hours: string;
  min: string;
  categoryId?: string | null;
}

interface OwnEditDraft {
  index: number;
  name: string;
  options: OwnOption[];
  error: string;
}

export interface WizardPhoto {
  id: string;
  src: string;
  file?: File;
}

export interface WizardDraft {
  name: string;
  description: string;
  taxonomyId: string | null;
  subcategory: string | null;
  typeId: string | null;
  categoryId: string | null;
  own: OwnGroup[];
  price: string;
  durationHours: string;
  durationMinutes: string;
  sizesOn: boolean;
  lengthsOn: boolean;
  sizes: VariationRow[];
  lengths: VariationRow[];
  addons: ServiceAddonLink[];
  status: string;
  extra: string;
  photos: WizardPhoto[];
}

export interface WizardState {
  mode: "add" | "edit";
  step: number;
  suggestionsOpen: boolean;
  flash: Record<string, number> | null;
  editId: string | null;
  search: string;
  other: boolean;
  review: boolean;
  openAddon: string | null;
  newAddon: AddonQuickDraft | null;
  addonQuery: string;
  draft: WizardDraft;
  categoryFilter?: string;
  pickGroup?: boolean;
  newCategory?: CategoryDraft | null;
  ownEdit?: OwnEditDraft | null;
  pendingAddons?: StudioAddon[];
  addonCategory?: string | null;
  subcategoryTipOpen?: boolean;
}

export interface Taxonomy {
  id: string;
  name: string;
  types: ServiceType[];
  subcategories: string[];
  other?: string;
  sizes: string[] | null;
  lengths: string[] | null;
}
