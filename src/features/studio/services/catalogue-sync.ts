// Saves categories, add-ons and services by comparing them with what was last saved:
// Studio replaces only the items it changes, so a new reference means "save this one".
import { useEffect, useRef } from "react";
import {
  removeAddon,
  removeCategory,
  removeService,
  saveAddon,
  saveCategories,
  saveService,
} from "../../../lib/studio-api/services";
import { fromCategories, fromStudioAddon, fromStudioService } from "./records";
import type { StudioSync } from "../core/sync";
import type { StudioState } from "../core/types";

type Catalogue = Pick<StudioState, "categories" | "addons" | "services">;

const getChanged = <T>(list: T[], previous: T[]) =>
  list.filter((item, index) => previous.indexOf(item) !== index);

const getRemovedIds = <T extends { id: string }>(list: T[], previous: T[]) =>
  previous
    .filter(({ id }) => !list.some((item) => item.id === id))
    .map(({ id }) => id);

export const useCatalogueSync = (
  { categories, addons, services }: StudioState,
  sync: StudioSync | null,
) => {
  const saved = useRef<Catalogue>({ categories, addons, services });

  useEffect(() => {
    const before = saved.current;

    if (
      !sync ||
      (before.categories === categories &&
        before.addons === addons &&
        before.services === services)
    )
      return;

    saved.current = { categories, addons, services };

    // parents before children: categories, add-ons, services; then removals the other way round
    sync.save(
      async (stylistId) => {
        const changedCategories = getChanged(categories, before.categories);

        if (changedCategories.length)
          await saveCategories(fromCategories(changedCategories, stylistId));

        for (const addon of getChanged(addons, before.addons))
          await saveAddon(fromStudioAddon(addon, stylistId));

        for (const service of getChanged(services, before.services)) {
          const { row, variations, addonLinks } = fromStudioService(
            service,
            stylistId,
            services.indexOf(service),
          );

          await saveService(row, variations, addonLinks);
        }

        for (const id of getRemovedIds(services, before.services))
          await removeService(id);

        for (const id of getRemovedIds(addons, before.addons))
          await removeAddon(id);

        for (const id of getRemovedIds(categories, before.categories))
          await removeCategory(id);
      },
      before,
      () => {
        // the put-back lists are what's saved, so they don't count as a new change
        saved.current = before;
      },
    );
  }, [categories, addons, services, sync]);
};
