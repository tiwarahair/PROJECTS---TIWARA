import type { BusinessValue } from "../../../components/business-details/types";
import { geocodeAddress } from "../../../lib/google-maps";
import { updateStylist, updateStylistAddress } from "../../../lib/studio-api";
import { toStoredBusinessType } from "../../../utils/business-type";

const getAddressQuery = ({ type, details }: BusinessValue) =>
  type === "mobile"
    ? details.basePostcode
    : [details.line1, details.city, details.postcode].join(", ");

/** Saves business details; a changed address is placed again so search distance stays right. */
export const saveBusiness = async (
  stylistId: string,
  value: BusinessValue,
  before: BusinessValue,
) => {
  const { details, type } = value;
  const isMobile = type === "mobile";
  const query = getAddressQuery(value);

  const place =
    query !== getAddressQuery(before) ? await geocodeAddress(query) : null;

  if (place && !place.location) throw new Error("We can’t find that address");

  await updateStylist(stylistId, {
    business_type: toStoredBusinessType(type),
    travel_radius_miles: isMobile ? Number(details.radius) || null : null,
    contact_phone: details.phone || null,
    contact_email: details.email || null,
    vat_registered: value.vatOn,
    vat_number: value.vatOn ? details.vat.replace(/\s/g, "") || null : null,
    ...(place?.location
      ? {
          location: `SRID=4326;POINT(${place.location.lng} ${place.location.lat})`,
          area_label: place.area,
        }
      : {}),
  });

  await updateStylistAddress(stylistId, {
    line1: isMobile ? null : details.line1 || null,
    line2: isMobile ? null : details.line2 || null,
    city: isMobile ? null : details.city || null,
    postcode: (isMobile
      ? details.basePostcode
      : details.postcode
    ).toUpperCase(),
  });
};
