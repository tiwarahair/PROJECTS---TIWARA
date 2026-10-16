import { formatPostcode } from "../../utils/address";
import type {
  BusinessDetailsProps,
  BusinessFieldName,
  BusinessFields,
  BusinessFormValues,
  BusinessPreset,
  BusinessValue,
  InitialBusiness,
} from "./types";

const getBaseBusiness = (): BusinessValue => ({
  type: "shop",
  vatOn: false,
  details: {
    line1: "118 Wilmslow Road",
    line2: "Unit 4",
    city: "Manchester",
    postcode: "M14 5AJ",
    basePostcode: "M14 5AJ",
    radius: "10",
    phone: "07700 900418",
    email: "info@tiwarashouse.com",
    vat: "",
  },
});

const toFormValues = ({
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

export const getInitialBusiness = (
  preset: BusinessPreset,
  value?: BusinessDetailsProps["value"],
): InitialBusiness => {
  const base = getBaseBusiness();

  // seeded by the host (Studio) from its saved business details
  if (value) {
    if (value.type) base.type = value.type;

    base.vatOn = !!value.vatOn;
    Object.assign(base.details, value.details ?? {});

    const values = toFormValues(base);

    return { saved: values, values, shownErrors: [], addressSource: "" };
  }

  const setFields = (fields: Partial<BusinessFields>) =>
    Object.assign(base.details, fields);

  let shownErrors: BusinessFieldName[] = [];
  let addressSource = "";

  if (preset === "chair") {
    base.type = "chair";

    setFields({
      line1: "Crown & Coil Salon, chair 3",
      line2: "41 Beech Road",
      postcode: "M21 9EG",
    });
  }

  if (preset === "home") {
    base.type = "home";
    setFields({ line1: "27 Heald Place", line2: "", postcode: "M14 5TQ" });
  }

  if (preset === "mobile") {
    base.type = "mobile";
    setFields({ basePostcode: "M16 8AF", radius: "10" });
  }

  if (preset === "vatValid" || preset === "vatInvalid") {
    base.vatOn = true;
    setFields({ vat: preset === "vatValid" ? "312 4567 89" : "312 4567" });
  }

  if (preset === "vatInvalid") shownErrors = ["vat"];

  const saved = toFormValues(base);

  if (preset === "unsaved") setFields({ phone: "07700 900512" });

  if (preset === "pcError") {
    setFields({ postcode: "M14 5T" });
    shownErrors = ["address"];
    addressSource = "manual";
  }

  return { saved, values: toFormValues(base), shownErrors, addressSource };
};
