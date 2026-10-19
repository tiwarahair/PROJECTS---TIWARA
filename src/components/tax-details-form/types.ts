import type { TaxBusiness, TaxDetails, TaxFixture } from "./logic";

export interface TaxDetailsFormProps {
  mode?: "setup" | "settings";
  fixture?: TaxFixture;
  legalName?: string;
  businessName?: string;
  business?: TaxBusiness;
  value?: Partial<TaxDetails>;
  onSubmit?: (details: TaxDetails) => void;
  onCancel?: () => void;
  /** Whether the fields differ from how the form opened. */
  onDirtyChange?: (isDirty: boolean) => void;
}
