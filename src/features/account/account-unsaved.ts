// Unsaved edits on the Account page: an open edit form whose values differ from what's saved.
import type { AddressForm, AccountState } from "./use-account";

const getAddressFields = ({
  label,
  isDefault,
  address,
}: Pick<AddressForm, "label" | "isDefault" | "address">) =>
  JSON.stringify([
    label,
    isDefault,
    address?.line1 ?? "",
    address?.line2 ?? "",
    address?.town ?? "",
    address?.postcode ?? "",
  ]);

const hasUnsavedAddress = ({ addressForm, addresses }: AccountState) => {
  if (!addressForm) return false;

  const saved = addresses.find(({ id }) => id === addressForm.id);

  const opened = saved
    ? { label: saved.label, isDefault: saved.isDefault, address: saved }
    : { label: "", isDefault: false, address: null };

  return getAddressFields(addressForm) !== getAddressFields(opened);
};

export const hasUnsavedEdits = (state: AccountState) => {
  const { edit, draft, profile, password, allergyEdit, allergyDraft, entries } =
    state;

  return (
    (!!edit && JSON.stringify(draft) !== JSON.stringify(profile)) ||
    (password.open && !!(password.current || password.next)) ||
    (allergyEdit >= 0 && allergyDraft !== (entries[allergyEdit]?.text ?? "")) ||
    hasUnsavedAddress(state)
  );
};

/** Closes every edit form without saving. */
export const getDiscardPatch = ({
  password,
}: AccountState): Partial<AccountState> => ({
  edit: null,
  fieldErrors: {},
  emailStep: "",
  allergyEdit: -1,
  addressForm: null,
  password: { ...password, open: false, current: "", next: "", tried: false },
});
