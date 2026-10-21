import type { Profile } from "./data";
import type { EditKey } from "./logic";
import { getSavedMobile } from "./saves";
import type { AccountCore } from "./use-core";
import type { EmailActions } from "./email-actions";
import type { AccountFeedback } from "./use-feedback";

export const getEditActions = (
  { stateRef, setState, forms, saveProfile }: AccountCore,
  { showToast }: AccountFeedback,
  { sendCodes, confirmCodes }: EmailActions,
) => {
  const applyEdit = async (key: EditKey, draft: Profile) => {
    if (key === "email") {
      const message = await sendCodes(draft.email.trim().toLowerCase());

      if (message) forms.edit.setError("email", { message });

      return;
    }

    const profile = { ...stateRef.current.profile };

    if (key === "name") {
      profile.first = draft.first.trim();
      profile.last = draft.last.trim();
    }

    if (key === "mobile") profile.mobile = getSavedMobile(draft.mobile);

    const { first, last, mobile } = profile;

    try {
      await saveProfile(key === "name" ? { first, last } : { mobile });
    } catch {
      return showToast("Your details couldn’t be saved. Try again");
    }

    setState({ profile, edit: null });
    showToast("Your details are updated");
  };

  const saveEdit = () => {
    const { edit: key, emailStep } = stateRef.current;

    if (!key) return;

    if (key === "email" && emailStep === "code") {
      void confirmCodes();

      return;
    }

    void forms.edit.handleSubmit(() =>
      applyEdit(key, forms.edit.getValues()),
    )();
  };

  return { saveEdit };
};
