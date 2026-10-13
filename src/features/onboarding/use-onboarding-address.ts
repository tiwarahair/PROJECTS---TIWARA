// The wizard's business address: picked or typed, then placed on the map.
import type { FieldPath } from "react-hook-form";
import type { EmittedAddress } from "../../components/address-finder/use-address-finder";
import { geocodeAddress } from "../../lib/google-maps";
import { isAddressValid } from "../../utils/address";
import type { OnboardingForm } from "./onboarding-state";
import type { OnboardingCore } from "./use-onboarding";

export const useOnboardingAddress = ({
  setState,
  save,
  formApi: { getValues, setValue },
}: OnboardingCore) => {
  /** Geocodes the address (or a mobile stylist's postcode) once; false when Google can't place it. */
  const geocode = async () => {
    const { type, line1, city, postcode } = getValues();

    const place = await geocodeAddress(
      type === "mobile" ? postcode : [line1, city, postcode].join(", "),
    );

    if (!place?.location) return false;

    const { lat, lng } = place.location;

    setState(
      { geocodedLatLng: [lat, lng], pinLatLng: null, area: place.area },
      save,
    );

    return true;
  };

  const setAddress = (address: EmittedAddress | null) => {
    const previousPostcode = getValues("postcode");

    const fields = address
      ? {
          line1: address.line1,
          line2: address.line2 || "",
          city: address.town,
          postcode: address.postcode,
        }
      : { line1: "", line2: "", city: "", postcode: "" };

    const isOk = !!address && isAddressValid(address);

    const addressLatLng: [number, number] | null =
      address && address.lat != null && address.lng != null
        ? [address.lat, address.lng]
        : null;

    const isNewPlace = fields.postcode !== previousPostcode;

    for (const [key, value] of Object.entries(fields))
      setValue(key as FieldPath<OnboardingForm>, value);

    setState(
      () => ({
        addressOpen: isOk,
        addressSource: address ? address.source : "",
        addressFinderFixture: "",
        ...(addressLatLng && isNewPlace
          ? {
              geocodedLatLng: addressLatLng,
              pinLatLng: null,
              area: address?.area ?? null,
            }
          : {}),
      }),
      () => {
        save();

        // a typed address has no location yet: place it so the pin starts there
        if (isOk && isNewPlace && !addressLatLng) void geocode();
      },
    );
  };

  return { geocode, setAddress };
};
