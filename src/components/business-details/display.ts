import { formatPostcode, isPostcodeValid } from "../../utils/address";
import type { TaxDetails } from "../tax-details-form/logic";

const AREAS: Record<string, string> = {
  M13: "Longsight",
  M14: "Rusholme",
  M15: "Moss Side",
  M16: "Whalley Range",
  M19: "Levenshulme",
  M20: "Didsbury",
  M21: "Chorlton",
  M32: "Stretford",
  M33: "Sale",
  // eslint-disable-next-line id-length -- postcode outward code, looked up from user input
  M8: "Cheetham Hill",
};

export const getAreaLabel = (postcode: string): string => {
  if (!isPostcodeValid(postcode)) return "Add your postcode to see your area";

  const [outward = ""] = formatPostcode(postcode).split(" ");
  const area = AREAS[outward];

  return area ? `${area}, ${outward}` : outward;
};

/** "GB 312 4567 89" (or the 12-digit grouping). */
export const formatVatNumber = (digits: string): string => {
  const grouped =
    digits.length === 9
      ? digits.replace(/(\d{3})(\d{4})(\d{2})/, "$1 $2 $3")
      : digits.replace(/(\d{3})(\d{4})(\d{2})(\d{3})/, "$1 $2 $3 $4");

  return `GB ${grouped}`;
};

export const getLegalRows = (
  details: Partial<TaxDetails> | null,
): { label: string; value: string }[] => {
  if (!details) return [];

  return details.kind === "ltd"
    ? [
        { label: "Business set up as", value: "Limited company" },
        { label: "Legal name", value: details.companyName ?? "" },
        { label: "Company number", value: details.companyNumber ?? "" },
      ]
    : [
        { label: "Business set up as", value: "Sole trader" },
        { label: "Legal name", value: details.legalName ?? "" },
      ];
};

export const cleanVatInput = (value: string) =>
  value
    .toUpperCase()
    .replace(/^\s*GB\s*/, "")
    .replace(/[^\d ]/g, "")
    .trimStart()
    .slice(0, 16);
