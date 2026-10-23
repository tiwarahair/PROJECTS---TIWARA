import { formatPostcode } from "../../utils/address";
import type { BusinessFormValues, BusinessValue } from "./types";

export const toFormValues = ({
  type,
  vatOn,
  details: { line1, line2, city, postcode, ...rest },
}: BusinessValue): BusinessFormValues => ({
  type,
  vatOn,
  address: { line1, line2, city, postcode },
  ...rest,
});

export const toBusinessValue = ({
  type,
  vatOn,
  address,
  ...rest
}: BusinessFormValues): BusinessValue => ({
  type,
  vatOn,
  details: {
    ...address,
    ...rest,
    postcode: formatPostcode(address.postcode),
    basePostcode: formatPostcode(rest.basePostcode),
  },
});
