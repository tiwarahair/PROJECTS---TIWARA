// Account → Payment methods and Saved addresses.
import { getErrorMessage } from "../../stores/api-slice";
import type { SavedAddress } from "../../types/address";
import { formatPostcode } from "../../utils/address";
import type { SavedCard } from "./data";
import type { AddressFormValues } from "./schemas";
import type { AccountCore } from "./use-core";
import type { AccountFeedback } from "./use-feedback";

const getAddressFailure = (error: unknown) =>
  getErrorMessage(error) === "too_many_addresses"
    ? "You can save up to 10 addresses"
    : "Your address couldn’t be saved. Try again";

export const getWalletActions = (
  {
    stateRef,
    dataRef,
    setState,
    forms,
    saveAddress: saveAddressRow,
    deleteAddress,
    setDefaultCard,
    removeCard,
    refetchCards,
  }: AccountCore,
  { focusLater, showToast, saveWith }: AccountFeedback,
) => ({
  finishCardSetup: async (card: string, isDefault: boolean) => {
    try {
      if (isDefault || !dataRef.current.cards.length)
        await setDefaultCard(card).unwrap();
      else await refetchCards();
    } catch {
      // the card is saved; only the default didn't change
    }

    setState({ dialog: null }, () => focusLater("returnFocus"));
    showToast("Card saved");
  },

  makeDefaultCard: ({ id, brand, last4 }: SavedCard) =>
    saveWith(
      () => setDefaultCard(id).unwrap(),
      `${brand} •••• ${last4} is now your default card`,
      "Your default card couldn’t be changed. Try again",
    ),

  removeSavedCard: (id: string) =>
    saveWith(
      () => removeCard(id).unwrap(),
      "Card removed",
      (error) =>
        getErrorMessage(error) === "card_in_use"
          ? "This card is needed for an upcoming booking"
          : "Your card couldn’t be removed. Try again",
    ),

  saveAddress: forms.address.handleSubmit(
    async ({ label, address, isDefault }: AddressFormValues) => {
      const { addressForm } = stateRef.current;

      if (!addressForm || !address) return;

      const isSaved = await saveWith(
        () =>
          saveAddressRow({
            id: addressForm.mode === "edit" ? (addressForm.id ?? null) : null,
            address: {
              label: label.trim() || "Address",
              line1: address.line1 ?? "",
              line2: address.line2 ?? "",
              town: address.town ?? "",
              postcode: formatPostcode(address.postcode),
              lat: address.lat ?? null,
              lng: address.lng ?? null,
              isDefault,
            },
          }).unwrap(),
        "Address saved",
        getAddressFailure,
      );

      if (isSaved) setState({ addressForm: null });
    },
  ),

  makeDefaultAddress: ({ id, ...address }: SavedAddress) =>
    saveWith(
      () =>
        saveAddressRow({
          id,
          address: { ...address, isDefault: true },
        }).unwrap(),
      `${address.label} is now your default address`,
      getAddressFailure,
    ),

  removeAddress: (id: string) =>
    saveWith(
      () => deleteAddress(id).unwrap(),
      "Address removed",
      "Your address couldn’t be removed. Try again",
    ),
});
