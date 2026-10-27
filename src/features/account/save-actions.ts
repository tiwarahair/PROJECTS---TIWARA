import type { ChangeEvent } from "react";
import {
  changePassword,
  PASSWORD_FAILURES,
  sendReauthenticationCode,
} from "../../lib/account-changes";
import { fetchMyData } from "../../lib/my-data";
import { logOut } from "../../stores/session-slice";
import { downloadFile } from "../../utils/download-file";
import { EMPTY_PASSWORD } from "./forms";
import type { AccountCore } from "./use-core";
import type { AccountFeedback } from "./use-feedback";

export const getSaveActions = (
  {
    stateRef,
    setState,
    forms,
    navigate,
    dispatch,
    saveProfile,
    setPhoto,
    saveSensitivity: saveSensitivityText,
  }: AccountCore,
  { focusLater, showToast, saveWith }: AccountFeedback,
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
    const isSaved = await saveWith(
      () => saveProfile({ marketing: isOn }),
      isOn
        ? "You’ll get offers and news by email"
        : "You won’t get offers and news by email",
      "Your email choice couldn’t be saved. Try again",
    );

    if (isSaved) setState({ marketing: isOn });
  };

  const savePhoto = (file: File | null) =>
    saveWith(
      () => setPhoto(file),
      file ? "Your photo is updated" : "Photo removed",
      file
        ? "Your photo couldn’t be saved. Try again"
        : "Your photo couldn’t be removed. Try again",
    );

  const saveSensitivity = async (stylistId: string, text: string) => {
    const isSaved = await saveWith(
      () => saveSensitivityText(stylistId, text.trim()),
      text.trim() ? "Saved" : "Removed",
      text.trim()
        ? "Your allergy details couldn’t be saved. Try again"
        : "Your allergy details couldn’t be removed. Try again",
    );

    if (isSaved) setState({ allergyEdit: -1, allergyConsent: false });

    return isSaved;
  };

  const downloadMyData = (userId: string) =>
    saveWith(
      async () =>
        downloadFile(
          `tiwaras-house-data-${new Date().toISOString().slice(0, 10)}.json`,
          JSON.stringify(await fetchMyData(userId), null, 2),
          "application/json",
        ),
      "Your data is downloaded",
      "Your data couldn’t be downloaded. Try again",
    );

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

    setState({ photoError: "" });
    void savePhoto(file);
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
  const endSession = (scope?: "global") => dispatch(logOut(scope));

  const logout = () => {
    endSession();
    navigate("/");
  };

  return {
    savePassword,
    sendPasswordCode,
    saveMarketing,
    savePhoto,
    onPhoto,
    saveSensitivity,
    downloadMyData,
    copy,
    endSession,
    logout,
  };
};
