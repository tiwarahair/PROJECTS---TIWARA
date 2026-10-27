import type { Profile } from "./data";
import type { EditKey } from "./logic";
import { getSavedMobile } from "./saves";
import type { AccountCore } from "./use-core";
import type { EmailActions } from "./email-actions";
import type { AccountFeedback } from "./use-feedback";

export const getEditActions = (
  { stateRef, setState, forms, saveProfile }: AccountCore,
  { saveWith }: AccountFeedback,
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

    const isSaved = await saveWith(
      () => saveProfile(key === "name" ? { first, last } : { mobile }),
      "Your details are updated",
      "Your details couldn’t be saved. Try again",
    );

    if (isSaved) setState({ profile, edit: null });
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
