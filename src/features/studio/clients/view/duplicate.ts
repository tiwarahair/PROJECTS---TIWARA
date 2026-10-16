import { getAvatarSrc } from "../../core/format";
import type { DuplicateHit } from "../../core/model";
import type { StudioClient } from "../../core/types";
import { getFirstName } from "./context";

export interface DuplicateView {
  isOn: boolean;
  img?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  onSelect?: () => void;
}

/** The "already uses this phone / email" notice. */
export const getDuplicateView = (
  hit: DuplicateHit | null,
  cta: string,
  onSelect: (client: StudioClient) => void,
): DuplicateView => {
  if (!hit) return { isOn: false };

  const fieldName = hit.field === "phone" ? "phone number" : "email";

  return {
    isOn: true,
    img: getAvatarSrc(hit.client),
    title: `${hit.client.name} already uses this ${fieldName}`,
    subtitle: "Each client needs their own phone number and email.",
    cta: cta.replace("{f}", getFirstName(hit.client)),
    onSelect: () => onSelect(hit.client),
  };
};
