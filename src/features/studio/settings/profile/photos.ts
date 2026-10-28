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

export const addPortfolioPhotos = (
  { sync, getState, setState }: StudioContext,
  files: { file: File; previewUrl: string }[],
) => {
  const before = getState().portfolio;

  const uploads = files.map(({ file, previewUrl }) => ({
    id: crypto.randomUUID(),
    file,
    src: previewUrl,
  }));

  setState({
    portfolio: before.concat(uploads.map(({ id, src }) => ({ id, src }))),
  });

  sync.save(
    async (stylistId) => {
      for (const [index, { id, file }] of uploads.entries()) {
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

        setState(({ portfolio }) => ({
          portfolio: portfolio.map((photo) =>
            photo.id === id ? { id, src: getPhotoUrl(path), path } : photo,
          ),
        }));
      }
    },
    { portfolio: before },
  );
};

export const removePortfolioItem = (
  { sync, getState, setState }: StudioContext,
  id: string,
) => {
  const before = getState().portfolio;
  const photo = before.find((item) => item.id === id);

  setState({ portfolio: before.filter((item) => item.id !== id) });

  sync.save(
    async () => {
      await removePortfolioPhoto(id);

      if (photo?.path) await removePhoto(photo.path);
    },
    { portfolio: before },
  );
};
