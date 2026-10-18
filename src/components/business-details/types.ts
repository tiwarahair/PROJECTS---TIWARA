// BusinessDetails values, validation and display values
import type { UseFormRegisterReturn } from "react-hook-form";
import type { TaxDetails } from "../tax-details-form/logic";

export type BusinessType = "shop" | "chair" | "home" | "mobile";
export type BusinessPreset =
  BusinessType | "vatValid" | "vatInvalid" | "unsaved" | "pcError";
export type BusinessFieldName =
  "address" | "basePostcode" | "phone" | "email" | "vat";

export interface BusinessFields {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  basePostcode: string;
  radius: string;
  phone: string;
  email: string;
  vat: string;
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface BusinessValue {
  type: BusinessType;
  vatOn: boolean;
  details: BusinessFields;
}

export interface BusinessAddress {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
}

export interface BusinessFormValues {
  type: BusinessType;
  vatOn: boolean;
  address: BusinessAddress;
  basePostcode: string;
  radius: string;
  phone: string;
  email: string;
  vat: string;
}

export interface InitialBusiness {
  saved: BusinessFormValues;
  values: BusinessFormValues;
  shownErrors: BusinessFieldName[];
  addressSource: string;
}

/** What the host (Studio) gets after every render to drive its own save bar. */
export interface BusinessDetailsApi {
  canSave: boolean;
  save: () => void;
}

export interface BusinessDetailsProps {
  preset?: BusinessPreset;
  /** Accepted for the host; not rendered. */
  stripe?: "connected" | "company" | "none" | "action";
  scrollTo?: "" | "type" | "location" | "vat" | "legal";
  embedded?: boolean;
  hideSave?: boolean;
  value?: Partial<Omit<BusinessValue, "details">> & {
    details?: Partial<BusinessFields>;
  };
  /** Legal details from TaxDetailsForm; null shows the "add tax details" state. */
  tax?: Partial<TaxDetails> | null;
  onSave?: (value: BusinessValue) => void;
  onState?: (api: BusinessDetailsApi) => void;
  onEditTax?: () => void;
  onConnectStripe?: () => void;
}

export interface FieldView {
  id: string;
  errorId: string;
  label: string;
  error: string;
  input: UseFormRegisterReturn;
}
