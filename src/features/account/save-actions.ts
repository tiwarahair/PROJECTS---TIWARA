import type { ChangeEvent } from "react";
import { logOut } from "../../stores/session-slice";
import type { SavedAddress } from "../../types/address";
import { saveAddresses } from "../../utils/saved-addresses";
import { EMPTY_CARD, EMPTY_PASSWORD } from "./forms";
import { getSavedAddressList, toSavedCard } from "./saves";
import type { AddressFormValues, CardFormValues } from "./schemas";
import type { AccountCore } from "./use-account-core";
import type { AccountFeedback } from "./use-account-feedback";

export const getSaveActions = (
  { searchParams, stateRef, setState, forms, navigate, dispatch }: AccountCore,
  { focusLater, showToast }: AccountFeedback,
) => {
  const savePassword = forms.password.handleSubmit(() => {
    const hadPassword = stateRef.current.password.has;

    forms.password.reset(EMPTY_PASSWORD);

    setState({
      password: { has: true, open: false, show: false, changed: true },
    });

    showToast(
      hadPassword ? "Your password is updated" : "Your password is set",
    );
  });

  const saveCard = forms.card.handleSubmit((cardForm: CardFormValues) => {
    const { cards } = stateRef.current;
    const isDefault = !cards.length || cardForm.isDefault;
    const card = toSavedCard(cardForm, `c${Date.now()}`, isDefault);

    forms.card.reset(EMPTY_CARD);

    setState(
      (current) => ({
        cards: [
          ...current.cards.map((item) =>
            isDefault ? { ...item, isDefault: false } : item,
          ),
          card,
        ],
        dialog: null,
      }),
      () => focusLater("returnFocus"),
    );

    showToast("Card saved");
  });

  const setAddresses = (list: SavedAddress[]) => {
    saveAddresses(list, searchParams.toString());
    setState({ addresses: list });
  };

  const saveAddress = forms.address.handleSubmit((form: AddressFormValues) => {
    const { addressForm, addresses } = stateRef.current;

    if (!addressForm || !form.address) return;

    setAddresses(
      getSavedAddressList(
        addresses,
        addressForm,
        { ...form, address: form.address },
        `a${Date.now()}`,
      ),
    );

    setState({ addressForm: null });
    showToast("Address saved");
  });

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
    saveCard,
    saveAddress,
    setAddresses,
    onPhoto,
    copy,
    endSession,
    logout,
  };
};
