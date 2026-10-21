// Addresses saved on this device before they were kept per account; moved across once the client signs in.
import type { SavedAddress } from "../types/address";

const STORAGE_KEY = "tw_addrs";

export const readDeviceAddresses = (): SavedAddress[] => {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    ) as SavedAddress[];
  } catch {
    return [];
  }
};

export const writeDeviceAddresses = (addresses: SavedAddress[]): void => {
  try {
    if (addresses.length)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
};
