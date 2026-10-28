import { SERVICE_PHOTO_LIMIT } from "../../core/constants";
import { getCategoryById, getSortedCategories } from "../../core/model";
import type { StudioService, StudioState } from "../../core/types";

export const ALL_CATEGORIES = "all";

export const getPhotoServiceName = (
  { services }: StudioState,
  photoId: string,
) => services.find(({ photoIds }) => photoIds?.includes(photoId))?.name ?? "";

export const getAttachView = (
  state: StudioState,
  photoId: string,
  search: string,
  categoryId: string,
) => {
  const query = search.trim().toLowerCase();
  const services = state.services.filter(({ status }) => status !== "archived");

  const isCurrent = ({ photoIds }: StudioService) =>
    !!photoIds?.includes(photoId);

  const items = services
    .filter(
      ({ name, categoryId: serviceCategory }) =>
        (!query || name.toLowerCase().includes(query)) &&
        (categoryId === ALL_CATEGORIES || serviceCategory === categoryId),
    )
    .map((service) => {
      const count = service.photoIds?.length ?? 0;

      return {
        key: service.id,
        name: service.name,
        category: getCategoryById(state, service.categoryId)?.name ?? "",
        isDraft: service.status === "draft",
        count: `${count} of ${SERVICE_PHOTO_LIMIT}`,
        isCurrent: isCurrent(service),
        isFull: count >= SERVICE_PHOTO_LIMIT && !isCurrent(service),
      };
    });

  const categoryChips = [{ id: ALL_CATEGORIES, name: "All" }]
    .concat(
      getSortedCategories(state).filter(({ id }) =>
        services.some((service) => service.categoryId === id),
      ),
    )
    .map(({ id, name }) => ({ key: id, label: name, isOn: categoryId === id }));

  return {
    hasServices: services.length > 0,
    isAttached: state.services.some(isCurrent),
    categoryChips,
    items,
    hasNoResults: services.length > 0 && items.length === 0,
  };
};
