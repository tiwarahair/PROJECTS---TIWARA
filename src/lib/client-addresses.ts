// a signed-in client's saved addresses
import type { SavedAddress } from "../types/address";
import { supabase } from "./supabase";

export type AddressDraft = Omit<SavedAddress, "id">;

export const fetchClientAddresses = async (): Promise<SavedAddress[]> => {
  const { data, error } = await supabase
    .from("client_addresses")
    .select("id, label, line1, line2, town, postcode, lat, lng, is_default")
    .order("created_at");

  if (error) throw error;

  return data.map(({ is_default: isDefault, ...address }) => ({
    ...address,
    isDefault,
  }));
};

export const saveClientAddress = async ({
  id,
  address: { isDefault, ...address },
}: {
  id: string | null;
  address: AddressDraft;
}) => {
  const { data, error } = await supabase.rpc("save_client_address", {
    address: { ...address, is_default: isDefault },
    ...(id ? { target: id } : {}),
  });

  if (error) throw error;

  return data;
};

export const deleteClientAddress = async (id: string) => {
  const { error } = await supabase.rpc("delete_client_address", { target: id });

  if (error) throw error;

  return null;
};
