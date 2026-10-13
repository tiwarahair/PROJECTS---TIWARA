// The business type as the app shows it ("chair") and as the database stores it ("chair_rental").
import type { BusinessType } from "../components/business-details/business-details-logic";
import type { StylistDetails } from "../types/auth";

const BUSINESS_TYPES: [BusinessType, StylistDetails["businessType"]][] = [
  ["shop", "shop"],
  ["chair", "chair_rental"],
  ["home", "home_based"],
  ["mobile", "mobile"],
];

export const toStoredBusinessType = (type: string) =>
  BUSINESS_TYPES.find(([shown]) => shown === type)?.[1] ?? "shop";

export const toShownBusinessType = (type: string) =>
  BUSINESS_TYPES.find(([, stored]) => stored === type)?.[0] ?? "shop";
