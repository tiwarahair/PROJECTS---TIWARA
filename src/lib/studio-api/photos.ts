// Stylist photos: resized in the browser, stored with copies for srcset, and the portfolio rows.
import type { TablesInsert } from "../../types/database";
import {
  UPLOAD_WIDTHS,
  isUploadOriginal,
  toUploadVariant,
} from "../../utils/image-sources";
import { supabase } from "../supabase";
import { check, write } from "./request";

const PHOTO_BUCKET = "stylist-photos";

export const getPhotoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

/** The storage path inside a photo URL; null for anything else (previews, demo photos). */
export const getPhotoPath = (url: string) =>
  url.split(`/${PHOTO_BUCKET}/`)[1] ?? null;

let isWebpEncodable: boolean | null = null;

const canEncodeWebp = () => {
  if (isWebpEncodable !== null) return isWebpEncodable;

  try {
    isWebpEncodable = document
      .createElement("canvas")
      .toDataURL("image/webp")
      .startsWith("data:image/webp");
  } catch {
    // no canvas to try with: stick to JPEG
    isWebpEncodable = false;
  }

  return isWebpEncodable;
};

type CompressOptions = Parameters<
  typeof import("browser-image-compression").default
>[1];

// loaded on the first upload, once: most visitors never upload
let compressorImport: Promise<
  typeof import("browser-image-compression")
> | null = null;

export const compressPhoto = async (file: File, options: CompressOptions) => {
  compressorImport ??= import("browser-image-compression").catch(
    (error: unknown) => {
      // a failed download is retried on the next upload
      compressorImport = null;
      throw error;
    },
  );

  const { default: imageCompression } = await compressorImport;

  return imageCompression(file, { useWebWorker: true, ...options });
};

// names are unique per upload, so browsers and the CDN can keep a file for a year
const putFile = async (
  path: string,
  file: Blob,
  contentType: string,
  bucket = PHOTO_BUCKET,
) => {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType,
    cacheControl: "31536000",
  });

  if (error) throw error;
};

/** Resizes in the browser (long side 2000px for covers and portfolio, 600px for avatars), then uploads. */
export const uploadPhoto = async (path: string, file: File, maxSide = 2000) => {
  const resized = await compressPhoto(file, {
    maxWidthOrHeight: maxSide,
    maxSizeMB: 1.5,
    fileType: "image/jpeg",
  });

  await putFile(path, resized, "image/jpeg");

  return path;
};

/** uploadPhoto, plus WebP and JPEG copies at UPLOAD_WIDTHS beside it for srcset; `path` ends "-full.jpg". */
export const uploadPhotoWithCopies = async (path: string, file: File) => {
  await uploadPhoto(path, file);

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  bitmap.close();

  // the compressor sizes by the long side: convert each width to it
  const longSidePerWidth = Math.max(width, height) / width;

  const copies = UPLOAD_WIDTHS.map(async (copyWidth) => {
    const maxWidthOrHeight = Math.round(
      Math.min(copyWidth, width) * longSidePerWidth,
    );

    const jpeg = await compressPhoto(file, {
      maxWidthOrHeight,
      maxSizeMB: 1,
      fileType: "image/jpeg",
    });

    // a browser that can't encode WebP (Safari) stores the JPEG under the .webp name, so that source still loads
    const webp = canEncodeWebp()
      ? await compressPhoto(file, {
          maxWidthOrHeight,
          maxSizeMB: 1,
          fileType: "image/webp",
        })
      : jpeg;

    await Promise.all([
      putFile(toUploadVariant(path, copyWidth, "jpg"), jpeg, "image/jpeg"),
      putFile(toUploadVariant(path, copyWidth, "webp"), webp, webp.type),
    ]);
  });

  await Promise.all(copies);

  return path;
};

/** Deletes a photo and, for one with copies, the copies too. */
export const removePhoto = (path: string) =>
  check(
    supabase.storage
      .from(PHOTO_BUCKET)
      .remove(
        isUploadOriginal(path)
          ? [
              path,
              ...UPLOAD_WIDTHS.flatMap((copyWidth) => [
                toUploadVariant(path, copyWidth, "webp"),
                toUploadVariant(path, copyWidth, "jpg"),
              ]),
            ]
          : [path],
      ),
  );

export const addPortfolioPhoto = (row: TablesInsert<"portfolio_photos">) =>
  write(supabase.from("portfolio_photos").insert(row));

export const removePortfolioPhoto = (id: string) =>
  write(supabase.from("portfolio_photos").delete().eq("id", id));

const CLIENT_PHOTO_BUCKET = "client-photos";

export const uploadClientPhoto = async (path: string, file: Blob) => {
  const resized = await compressPhoto(new File([file], "photo"), {
    maxWidthOrHeight: 600,
    maxSizeMB: 0.5,
    fileType: "image/jpeg",
  });

  await putFile(path, resized, "image/jpeg", CLIENT_PHOTO_BUCKET);

  return path;
};

export const removeClientPhoto = (path: string) =>
  check(supabase.storage.from(CLIENT_PHOTO_BUCKET).remove([path]));

/** Signed URLs for private client photos, by path. */
export const getClientPhotoUrls = async (paths: string[]) => {
  if (!paths.length) return new Map<string, string>();

  const signed = await check(
    supabase.storage.from(CLIENT_PHOTO_BUCKET).createSignedUrls(paths, 86400),
  );

  return new Map(
    (signed ?? []).flatMap(({ path, signedUrl }) =>
      path && signedUrl ? [[path, signedUrl] as const] : [],
    ),
  );
};
