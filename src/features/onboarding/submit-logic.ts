import type { StylistDetails } from "../../types/auth";
import { toStoredBusinessType } from "../../utils/business-type";
import type { OnboardingForm, OnboardingState } from "./state";

export type FinishKind = "customer-login" | "customer-new" | "newpro" | "pro";

type LocationState = Pick<
  OnboardingState,
  "pinLatLng" | "geocodedLatLng" | "area"
>;

export const getWelcomeMessage = (
  kind: "customer-login" | "customer-new",
  first: string,
) =>
  kind === "customer-new"
    ? `Welcome to Tiwára’s House${first ? `, ${first}` : ""}`
    : `Welcome back${first ? `, ${first}` : ""}`;

export const getStylistDetails = (
  form: OnboardingForm,
  { pinLatLng, geocodedLatLng, area }: LocationState,
): StylistDetails => {
  const location = pinLatLng ?? geocodedLatLng;

  // w3 can't be passed without a location; saved progress always carries it
  if (!location) throw new Error("The business location is missing");

  const [lat, lng] = location;
  const isMobile = form.type === "mobile";

  return {
    ...form,
    businessType: toStoredBusinessType(form.type),
    lat,
    lng,
    areaLabel: area,
    travelRadiusMiles: isMobile ? form.radius : null,
    contactEmail: form.useContact ? form.email : form.businessEmail || null,
    contactPhone: form.useContact ? form.mobile : form.businessPhone || null,
    referralSource:
      form.referralSource === "Other"
        ? form.referralSourceOther
        : form.referralSource,
  };
};
