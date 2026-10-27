export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  /** "MM/YY" */
  expiry: string;
  isDefault: boolean;
}
