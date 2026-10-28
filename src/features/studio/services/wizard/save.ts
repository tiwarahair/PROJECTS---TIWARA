import { getCategoryById } from "../../core/model";
import { formatDuration } from "../../../../utils/dates";
import { addPortfolioPhotos } from "../../settings/profile/photos";
import type { WizardContext } from "./context";

export const saveService = ({
  state,
  setState,
  actions,
  context,
  wizard,
  draft,
  base,
}: WizardContext) => {
  const isExtraDefault = String(draft.extra || "") === "";

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
    extraCustom: !isExtraDefault,
    extra: isExtraDefault ? state.rules.extra || 0 : parseInt(draft.extra) || 0,
    status: draft.status && draft.status !== "draft" ? draft.status : "active",
    sizesOn: draft.sizesOn,
    lengthsOn: draft.lengthsOn,
    sizes: draft.sizes,
    lengths: draft.lengths,
    addons: draft.addons,
    photoIds: draft.photos.map(({ id }) => id),
  };

  const newPhotos = draft.photos.flatMap(({ id, src, file }) =>
    file ? [{ id, file, previewUrl: src }] : [],
  );

  // queued before the catalogue save, so the photos exist when the service links them
  if (newPhotos.length) addPortfolioPhotos(context, newPhotos);

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
