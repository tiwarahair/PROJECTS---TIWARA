import { supabase } from "./supabase";

const getTokenKey = (userId: string) => `tw_trusted_device:${userId}`;

const readToken = (userId: string) => {
  try {
    return localStorage.getItem(getTokenKey(userId));
  } catch {
    return null;
  }
};

const forgetToken = (userId: string) => {
  try {
    localStorage.removeItem(getTokenKey(userId));
  } catch {
    // storage unavailable
  }
};

const getSessionUser = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
};

export const isTrustedDevice = async () => {
  const user = await getSessionUser();

  if (!user || user.app_metadata.is_admin === true) return false;

  const token = readToken(user.id);

  if (!token) return false;

  const { data, error } = await supabase.rpc("check_trusted_device", {
    token,
  });

  if (error) return false;

  if (!data) forgetToken(user.id);

  return data;
};

export const trustThisDevice = async () => {
  const user = await getSessionUser();

  if (!user || user.app_metadata.is_admin === true) return;

  const { data, error } = await supabase.rpc("trust_device");

  if (error || !data) return;

  try {
    localStorage.setItem(getTokenKey(user.id), data);
  } catch {
    // storage unavailable
  }
};

export const revokeTrustedDevices = async () => {
  const user = await getSessionUser();

  if (user) forgetToken(user.id);

  const { error } = await supabase.rpc("revoke_trusted_devices");

  if (error) throw error;
};
