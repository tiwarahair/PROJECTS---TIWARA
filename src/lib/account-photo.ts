import { compressPhoto } from "./studio-api/photos";
import { supabase } from "./supabase";

const BUCKET = "account-photos";

const getPath = (userId: string) => `${userId}/photo.jpg`;

const savePath = async (userId: string, photoPath: string | null) => {
  const { error } = await supabase
    .from("profiles")
    .update({ photo_path: photoPath })
    .eq("id", userId);

  if (error) throw error;
};

export const getAccountPhotoUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) throw error;

  return data.signedUrl;
};

/** Signed links for the account photos of a stylist's linked clients, keyed by path. */
export const getAccountPhotoUrls = async (paths: string[]) => {
  if (!paths.length) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 86400);

  if (error) throw error;

  return new Map(
    data.flatMap(({ path, signedUrl }) =>
      path && signedUrl ? [[path, signedUrl] as const] : [],
    ),
  );
};

export const uploadAccountPhoto = async ({
  userId,
  file,
}: {
  userId: string;
  file: File;
}) => {
  const resized = await compressPhoto(file, {
    maxWidthOrHeight: 400,
    maxSizeMB: 0.3,
    fileType: "image/jpeg",
  });

  // the same name every time, so it mustn't be cached for long
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(getPath(userId), resized, {
      upsert: true,
      contentType: "image/jpeg",
      cacheControl: "60",
    });

  if (error) throw error;

  await savePath(userId, getPath(userId));

  return getPath(userId);
};

export const removeAccountPhoto = async (userId: string) => {
  await savePath(userId, null);
  await supabase.storage.from(BUCKET).remove([getPath(userId)]);

  return null;
};

export const readAccountPhoto = async (userId: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(getPath(userId));

  if (error) throw error;

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(data);
  });
};
