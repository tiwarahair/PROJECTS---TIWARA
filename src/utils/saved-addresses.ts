// Client account saved addresses (Account → Saved addresses, Booking for mobile stylists).
import type { SavedAddress } from "../types/address";

const STORAGE_KEY = "tw_addrs";

export const getSavedAddresses = (): SavedAddress[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored ? (JSON.parse(stored) as SavedAddress[]) : [];
  } catch {
    return [];
  }
};

export const saveAddresses = (addresses: SavedAddress[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // storage unavailable: nothing to persist to
  }
};
