/** A client's saved address (Account → Saved addresses). */
export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2: string;
  town: string;
  postcode: string;
  isDefault: boolean;
}

/** Any address value the finder and validators accept. */
export interface AddressValue {
  line1?: string;
  line2?: string;
  town?: string;
  postcode?: string;
}
