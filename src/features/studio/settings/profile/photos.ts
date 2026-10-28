// Studio photo uploads: cover, avatar and portfolio.
import {
  addPortfolioPhoto,
  getPhotoPath,
  getPhotoUrl,
  removePhoto,
  removePortfolioPhoto,
  uploadPhoto,
  uploadPhotoWithCopies,
} from "../../../../lib/studio-api/photos";
import { updateStylist } from "../../../../lib/studio-api/settings";
import type { StudioContext } from "../../core/actions";
import type { StudioService } from "../../core/types";

const AVATAR_SIDE = 600;

/** Replaces the cover or avatar: preview straight away, upload, point the stylist at it, then delete the old file. */
export const replacePhoto = (
  { sync, getState, setState }: StudioContext,
  kind: "cover" | "avatar",
  file: File,
  previewUrl: string,
) => {
  const isCover = kind === "cover";

  const toPatch = (url: string | null) =>
    isCover ? { coverUrl: url } : { avatarUrl: url };

  const before = isCover ? getState().coverUrl : getState().avatarUrl;

  setState(toPatch(previewUrl));

  sync.save(async (stylistId) => {
    const path = isCover
      ? await uploadPhotoWithCopies(
          `${stylistId}/cover-${Date.now()}-full.jpg`,
          file,
        )
      : await uploadPhoto(
          `${stylistId}/avatar-${Date.now()}.jpg`,
          file,
          AVATAR_SIDE,
        );

    await updateStylist(
      stylistId,
      isCover ? { cover_path: path } : { avatar_path: path },
    );

    setState(toPatch(getPhotoUrl(path)));

    const oldPath = before && getPhotoPath(before);

    // the new photo is saved either way; a leftover file isn't worth undoing that
    if (oldPath) await removePhoto(oldPath).catch(() => undefined);
  }, toPatch(before));
};

const withoutPhotos = (
  services: StudioService[],
  isGone: (photoId: string) => boolean,
) =>
  services.map((service) =>
    service.photoIds?.some(isGone)
      ? { ...service, photoIds: service.photoIds.filter((id) => !isGone(id)) }
      : service,
  );

const withPhoto = (
  services: StudioService[],
  serviceId: string | null | undefined,
  photoId: string,
) =>
  services.map((service) =>
    service.id === serviceId
      ? { ...service, photoIds: [...(service.photoIds ?? []), photoId] }
      : service,
  );

export const addPortfolioPhotos = (
  { sync, getState, setState }: StudioContext,
  files: { id?: string; file: File; previewUrl: string }[],
) => {
  const before = getState().portfolio;

  const uploads = files.map(({ id, file, previewUrl }) => ({
    id: id ?? crypto.randomUUID(),
    file,
    src: previewUrl,
  }));

  setState({
    portfolio: before.concat(uploads.map(({ id, src }) => ({ id, src }))),
  });

  const saved = new Set<string>();

  const isFailed = (photoId: string) =>
    uploads.some(({ id }) => id === photoId) && !saved.has(photoId);

  sync.save(
    async (stylistId) => {
      for (const [index, { id, file, src }] of uploads.entries()) {
        const path = await uploadPhotoWithCopies(
          `${stylistId}/portfolio/${id}-full.jpg`,
          file,
        );

        await addPortfolioPhoto({
          id,
          stylist_id: stylistId,
          path,
          sort: before.length + index,
        });

        saved.add(id);

        setState(({ portfolio }) => ({
          portfolio: portfolio.map((photo) =>
            photo.id === id ? { id, src: getPhotoUrl(path), path } : photo,
          ),
        }));

        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      }
    },
    // photos that saved before a failure stay, so they match the database
    ({ portfolio, services }) => ({
      portfolio: portfolio.filter(({ id }) => !isFailed(id)),
      services: withoutPhotos(services, isFailed),
    }),
  );
};

export const removePortfolioItem = (
  { sync, getState, setState }: StudioContext,
  id: string,
) => {
  const before = getState().portfolio;
  const photo = before.find((item) => item.id === id);

  const serviceId = getState().services.find(({ photoIds }) =>
    photoIds?.includes(id),
  )?.id;

  setState(({ services }) => ({
    portfolio: before.filter((item) => item.id !== id),
    services: withoutPhotos(services, (photoId) => photoId === id),
  }));

  sync.save(
    async () => {
      await removePortfolioPhoto(id);

      if (photo?.path) await removePhoto(photo.path);
    },
    ({ services }) => ({
      portfolio: before,
      services: withPhoto(services, serviceId, id),
    }),
  );
};

export const attachPhoto = (
  { setState }: StudioContext,
  photoId: string,
  serviceId: string | null,
) =>
  setState(({ services }) => ({
    services: withPhoto(
      withoutPhotos(services, (id) => id === photoId),
      serviceId,
      photoId,
    ),
  }));
