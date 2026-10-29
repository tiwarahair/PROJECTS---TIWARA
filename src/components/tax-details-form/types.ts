import type { TaxBusiness, TaxDetails } from "./logic";

export interface TaxDetailsFormProps {
  mode?: "setup" | "settings";
  legalName: string;
  businessName: string;
  business?: TaxBusiness;
  value?: Partial<TaxDetails>;
  /** Submit stays off until a returned promise settles. */
  onSubmit?: (details: TaxDetails) => void | Promise<void>;
  onCancel?: () => void;
  /** Whether the fields differ from how the form opened. */
  onDirtyChange?: (isDirty: boolean) => void;
}
