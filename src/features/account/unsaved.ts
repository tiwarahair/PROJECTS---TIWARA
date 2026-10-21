// Unsaved edits on the Account page: an open edit form whose values differ from what's saved.
import type { Profile } from "./data";
import type { AddressFormValues, PasswordFormValues } from "./schemas";
import type { SavedAddress } from "../../types/address";
import type { AccountState } from "./state";

interface FormValues {
  draft: Profile;
  password: PasswordFormValues;
  address: AddressFormValues;
}

const getAddressFields = ({ label, isDefault, address }: AddressFormValues) =>
  JSON.stringify([
    label,
    isDefault,
    address?.line1 ?? "",
    address?.line2 ?? "",
    address?.town ?? "",
    address?.postcode ?? "",
  ]);

const hasUnsavedAddress = (
  { addressForm }: AccountState,
  values: AddressFormValues,
  addresses: SavedAddress[],
) => {
  if (!addressForm) return false;

  const saved = addresses.find(({ id }) => id === addressForm.id);

  const opened = saved
    ? { label: saved.label, isDefault: saved.isDefault, address: saved }
    : { label: "", isDefault: false, address: null };

  return getAddressFields(values) !== getAddressFields(opened);
};

export const hasUnsavedEdits = (
  state: AccountState,
  values: FormValues,
  addresses: SavedAddress[],
) => {
  const { edit, profile, password, allergyEdit, allergyDraft, entries } = state;

  return (
    (!!edit && JSON.stringify(values.draft) !== JSON.stringify(profile)) ||
    (password.open && !!(values.password.code || values.password.next)) ||
    (allergyEdit >= 0 && allergyDraft !== (entries[allergyEdit]?.text ?? "")) ||
    hasUnsavedAddress(state, values.address, addresses)
  );
};

/** Closes every edit form without saving. */
export const getDiscardPatch = ({
  password,
}: AccountState): Partial<AccountState> => ({
  edit: null,
  emailStep: "",
  allergyEdit: -1,
  addressForm: null,
  password: { ...password, open: false, isCodeSent: false },
});
