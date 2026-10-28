import type {
  Catalogue,
  ServiceGroup,
  ServiceType,
} from "../../../../types/catalogue";
import type { StudioService, StudioState, Taxonomy } from "../types";

const toTaxonomyGroup = (
  { types, customisations }: Catalogue,
  { id, name }: ServiceGroup,
): Taxonomy => {
  const groupTypes = types.filter(
    ({ groupId, isActive }) => isActive && groupId === id,
  );

  const platformOptions = customisations[id];

  return {
    id,
    name,
    types: groupTypes,
    subcategories: groupTypes
      .filter(({ isOther }) => !isOther)
      .map((type) => type.name),
    other: groupTypes.find(({ isOther }) => isOther)?.name,
    sizes: platformOptions?.size.map(({ label }) => label) ?? null,
    lengths: platformOptions?.length.map(({ label }) => label) ?? null,
  };
};

/** The shared catalogue grouped for Studio. */
export const getTaxonomies = ({ catalogue }: Pick<StudioState, "catalogue">) =>
  catalogue.groups.map((group) => toTaxonomyGroup(catalogue, group));

export const getTaxonomy = (
  { catalogue }: Pick<StudioState, "catalogue">,
  id: string | null | undefined,
): Taxonomy | null => {
  const group = catalogue.groups.find((item) => item.id === id);

  return group ? toTaxonomyGroup(catalogue, group) : null;
};

export const findServiceType = (
  {
    typeId,
    taxonomyId,
    subcategory,
  }: Pick<StudioService, "typeId" | "taxonomyId" | "subcategory">,
  types: ServiceType[],
) =>
  types.find(({ id }) => id === typeId) ??
  types.find(
    ({ groupId, name }) => groupId === taxonomyId && name === subcategory,
  ) ??
  null;
