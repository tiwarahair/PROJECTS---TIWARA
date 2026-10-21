import type { ChangeEvent } from "react";
import {
  changePassword,
  PASSWORD_FAILURES,
  sendReauthenticationCode,
} from "../../lib/account-changes";
import { logOut } from "../../stores/session-slice";
import type { SavedAddress } from "../../types/address";
import { getErrorMessage } from "../../stores/api-slice";
import { formatPostcode } from "../../utils/address";
import type { SavedCard } from "./data";
import { EMPTY_PASSWORD } from "./forms";
import type { AddressFormValues } from "./schemas";
import type { AccountCore } from "./use-core";
import type { AccountFeedback } from "./use-feedback";

export const getSaveActions = (
  {
    stateRef,
    dataRef,
    setState,
    forms,
    navigate,
    dispatch,
    saveProfile,
    saveAddress: saveAddressRow,
    deleteAddress,
    setDefaultCard,
    removeCard,
    refetchCards,
  }: AccountCore,
  { focusLater, showToast }: AccountFeedback,
) => {
  const sendPasswordCode = () =>
    sendReauthenticationCode()
      .then(() => {
        forms.password.clearErrors("root");

        setState(
          ({ password }) => ({ password: { ...password, isCodeSent: true } }),
          () => focusLater("password"),
        );

        showToast(`We emailed a code to ${stateRef.current.profile.email}`);
      })
      .catch(() => showToast("The code couldn’t be sent. Try again."));

  const savePassword = forms.password.handleSubmit(async ({ code, next }) => {
    const { has, signOthers } = stateRef.current.password;

    const failure = await changePassword(next, code, signOthers).catch(
      () => "failed",
    );

    // signed in over 24 hours ago: Supabase wants the emailed code first
    if (failure === "reauthentication_needed") return sendPasswordCode();

    if (failure)
      return forms.password.setError(
        failure === "reauthentication_not_valid" ? "code" : "root",
        { message: PASSWORD_FAILURES[failure] ?? PASSWORD_FAILURES.failed },
      );

    forms.password.reset(EMPTY_PASSWORD);

    setState(({ password }) => ({
      password: {
        ...password,
        has: true,
        open: false,
        show: false,
        changed: true,
        isCodeSent: false,
      },
    }));

    const updated = signOthers
      ? "Your password is updated. Other devices are logged out"
      : "Your password is updated";

    showToast(has ? updated : "Your password is set");
  });

  const saveMarketing = async (isOn: boolean) => {
    try {
      await saveProfile({ marketing: isOn });
    } catch {
      return showToast("Your email choice couldn’t be saved. Try again");
    }

    setState({ marketing: isOn });

    showToast(
      isOn
        ? "You’ll get offers and news by email"
        : "You won’t get offers and news by email",
    );
  };

  const finishCardSetup = async (card: string, isDefault: boolean) => {
    try {
      if (isDefault || !dataRef.current.cards.length)
        await setDefaultCard(card).unwrap();
      else await refetchCards();
    } catch {
      // the card is saved; only the default didn't change
    }

    setState({ dialog: null }, () => focusLater("returnFocus"));
    showToast("Card saved");
  };

  const makeDefaultCard = async ({ id, brand, last4 }: SavedCard) => {
    try {
      await setDefaultCard(id).unwrap();
    } catch {
      return showToast("Your default card couldn’t be changed. Try again");
    }

    showToast(`${brand} •••• ${last4} is now your default card`);
  };

  const removeSavedCard = async (id: string) => {
    try {
      await removeCard(id).unwrap();
    } catch (error) {
      return showToast(
        getErrorMessage(error) === "card_in_use"
          ? "This card is needed for an upcoming booking"
          : "Your card couldn’t be removed. Try again",
      );
    }

    showToast("Card removed");
  };

  const addressFailure = (error: unknown) =>
    showToast(
      getErrorMessage(error) === "too_many_addresses"
        ? "You can save up to 10 addresses"
        : "Your address couldn’t be saved. Try again",
    );

  const saveAddress = forms.address.handleSubmit(
    async ({ label, address, isDefault }: AddressFormValues) => {
      const { addressForm } = stateRef.current;

      if (!addressForm || !address) return;

      try {
        await saveAddressRow({
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
        }).unwrap();
      } catch (error) {
        return addressFailure(error);
      }

      setState({ addressForm: null });
      showToast("Address saved");
    },
  );

  const makeDefaultAddress = async ({ id, ...address }: SavedAddress) => {
    try {
      await saveAddressRow({
        id,
        address: { ...address, isDefault: true },
      }).unwrap();
    } catch (error) {
      return addressFailure(error);
    }

    showToast(`${address.label} is now your default address`);
  };

  const removeAddress = async (id: string) => {
    try {
      await deleteAddress(id).unwrap();
    } catch {
      return showToast("Your address couldn’t be removed. Try again");
    }

    showToast("Address removed");
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!/^image\/(jpeg|png)$/.test(file.type))
      return setState({ photoError: "Choose a JPG, JPEG or PNG photo." });

    if (file.size > 10 * 1024 * 1024)
      return setState({
        photoError: "That photo is too big. Choose one under 10MB.",
      });

    const reader = new FileReader();

    reader.onload = () => {
      setState({ photo: String(reader.result), photoError: "" });
      showToast("Your photo is updated");
    };

    reader.readAsDataURL(file);
  };

  const copy = (text: string, message: string) => {
    const done = () => showToast(message);

    try {
      navigator.clipboard.writeText(text).then(done, done);
    } catch {
      done();
    }
  };

  /** Ends the session without leaving the page (log out everywhere, delete account). */
  const endSession = () => dispatch(logOut());

  const logout = () => {
    endSession();
    navigate("/");
  };

  return {
    savePassword,
    sendPasswordCode,
    saveMarketing,
    finishCardSetup,
    makeDefaultCard,
    removeSavedCard,
    saveAddress,
    makeDefaultAddress,
    removeAddress,
    onPhoto,
    copy,
    endSession,
    logout,
  };
};
