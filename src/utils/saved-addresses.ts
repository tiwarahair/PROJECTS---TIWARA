// Client account saved addresses (Account → Saved addresses, Booking for mobile stylists).
// Board/fixture pages never persist; ?addrs=none = empty.
import { seedAddresses } from "../data";
import type { SavedAddress } from "../types/address";

const STORAGE_KEY = "tw_addrs";

const isBoard = (search: string): boolean => {
  try {
    const params = new URLSearchParams(search);

    return (
      params.has("fixture") ||
      params.get("board") === "true" ||
      params.has("addrs")
    );
  } catch {
    return true;
  }
};

export const getSavedAddresses = (
  search: string = window.location.search,
): SavedAddress[] => {
  try {
    const params = new URLSearchParams(search);

    if (params.get("addrs") === "none") return [];

    if (!isBoard(search)) {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) return JSON.parse(stored) as SavedAddress[];
    }
  } catch {
    // storage unavailable: fall back to the seed
  }

  return seedAddresses.map((address) => ({ ...address }));
};

export const saveAddresses = (
  addresses: SavedAddress[],
  search: string = window.location.search,
): void => {
  if (isBoard(search)) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch {
    // storage unavailable: nothing to persist to
  }
};
