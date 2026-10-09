export interface DemoAddress {
  id: string;
  line1: string;
  line2: string;
  town: string;
  postcode: string;
}

/** A client's saved address (Account → Saved addresses). */
export interface SavedAddress extends Omit<DemoAddress, "id"> {
  id: string;
  label: string;
  def: boolean;
}

/** Any address value the finder and validators accept. */
export interface AddressValue {
  line1?: string;
  line2?: string;
  town?: string;
  postcode?: string;
}
