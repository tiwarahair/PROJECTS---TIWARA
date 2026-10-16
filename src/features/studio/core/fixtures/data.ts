import type { TaxDetails } from "../../../../components/tax-details-form/tax-details-logic";
import type { OwnOption } from "../types";

export const WRONG_CODE =
  "That code isn’t right. Enter the latest code from your app.";

export const SOLE_TAX: Partial<TaxDetails> = {
  kind: "sole",
  nameYes: true,
  legalName: "Amara Okonkwo",
  day: "14",
  month: "06",
  year: "1994",
  nationalInsuranceNumber: "QQ123456C",
  isAddressSame: false,
  address: {
    line1: "27 Heald Place",
    line2: "",
    city: "Manchester",
    postcode: "M14 5TQ",
  },
};

export const LTD_TAX: Partial<TaxDetails> = {
  kind: "ltd",
  companyName: "Tiwára's House Ltd",
  companyNumber: "14829307",
  isAddressSame: true,
  address: {
    line1: "14 Blossom Street",
    line2: "",
    city: "Manchester",
    postcode: "M4 6AJ",
  },
};

export const getPartingOptions = (): OwnOption[] => [
  { label: "Straight", priceDelta: "0", minutesDelta: "0" },
  { label: "Zig-zag", priceDelta: "10", minutesDelta: "20" },
  {
    label: "Middle part",
    negative: true,
    priceDelta: "-5",
    minutesDelta: "-15",
  },
];
