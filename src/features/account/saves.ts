import type { AddressValue, SavedAddress } from "../../types/address";
import { formatPostcode } from "../../utils/address";
import type { SavedCard } from "./data";
import type { CardFormValues } from "./schemas";
import { CARD_BRANDS } from "./state";
import type { AddressForm } from "./state";

export const getSavedMobile = (mobile: string) => {
  const digits = mobile.replace(/\D/g, "").replace(/^0/, "");

  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
};

export const toSavedCard = (
  cardForm: CardFormValues,
  id: string,
  isDefault: boolean,
): SavedCard => {
  const number = cardForm.number.replace(/\D/g, "");
  const expiry = cardForm.expiry.replace(/\D/g, "");

  return {
    id,
    brand: CARD_BRANDS[number.charAt(0)] ?? "Card",
    last4: number.slice(-4),
    expiry: `${expiry.slice(0, 2)}/${expiry.slice(2, 4)}`,
    isDefault,
  };
};

interface AddressSave {
  label: string;
  address: AddressValue;
  isDefault: boolean;
}

export const getSavedAddressList = (
  addresses: SavedAddress[],
  addressForm: AddressForm,
  form: AddressSave,
  newId: string,
): SavedAddress[] => {
  const { address } = form;

  const clean = {
    line1: address.line1 ?? "",
    line2: address.line2 || "",
    town: address.town ?? "",
    postcode: formatPostcode(address.postcode),
  };

  const label = form.label.trim() || "Address";
  let list = addresses.slice();
  const isDefault = !list.length || form.isDefault;

  if (addressForm.mode === "edit")
    list = list.map((item) =>
      item.id === addressForm.id
        ? {
            ...item,
            ...clean,
            label,
            isDefault: isDefault || item.isDefault,
          }
        : item,
    );
  else list.push({ id: newId, label, ...clean, isDefault });

  if (isDefault) {
    const id =
      addressForm.mode === "edit" ? addressForm.id : list[list.length - 1]?.id;

    list = list.map((item) => ({ ...item, isDefault: item.id === id }));
  }

  return list;
};
