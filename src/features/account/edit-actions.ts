import type { ClipboardEvent, KeyboardEvent } from "react";
import type { Profile } from "./data";
import type { EditKey } from "./logic";
import { getSavedMobile } from "./saves";
import { CORRECT_CODE, EMPTY_CODE, EXPIRED_CODE } from "./state";
import type { AccountCore } from "./use-core";
import type { AccountFeedback } from "./use-feedback";

export const getEditActions = (
  { stateRef, setState, forms, refs }: AccountCore,
  {
    focusLater,
    showToast,
    startResendCountdown,
    stopResendCountdown,
  }: AccountFeedback,
) => {
  const checkCode = () => {
    const current = stateRef.current;
    const code = current.code.join("");

    if (code.length < 6)
      return setState({ codeError: "Enter the 6-digit code" });

    if (code === EXPIRED_CODE)
      return setState({
        codeError: "That code has expired. Send a new one.",
        resendIn: 0,
      });

    if (code !== CORRECT_CODE)
      return setState(({ shake }) => ({
        codeError: "That code isn’t right",
        shake: shake + 1,
      }));

    const previous = current.profile.email;

    setState({
      profile: {
        ...current.profile,
        email: forms.edit.getValues("email").trim().toLowerCase(),
      },
      pendingEmail: "",
      edit: null,
      emailStep: "",
      codeError: "",
    });

    stopResendCountdown();
    showToast(`Email updated. We’ve let ${previous} know.`);
  };

  const applyEdit = (key: EditKey, draft: Profile) => {
    if (key === "email") {
      setState(
        {
          emailStep: "code",
          pendingEmail: draft.email.trim().toLowerCase(),
          code: EMPTY_CODE,
          codeError: "",
          resendIn: 30,
        },
        () => focusLater("code"),
      );

      startResendCountdown();

      return;
    }

    const profile = { ...stateRef.current.profile };

    if (key === "name") {
      profile.first = draft.first.trim();
      profile.last = draft.last.trim();
    }

    if (key === "mobile") profile.mobile = getSavedMobile(draft.mobile);

    setState({ profile, edit: null });
    showToast("Your details are updated");
  };

  const saveEdit = () => {
    const { edit: key, emailStep } = stateRef.current;

    if (!key) return;

    if (key === "email" && emailStep === "code") return checkCode();

    void forms.edit.handleSubmit(() =>
      applyEdit(key, forms.edit.getValues()),
    )();
  };

  const fillCode = (digits: string) => {
    const code = digits.slice(0, 6).split("");

    while (code.length < 6) code.push("");

    setState({ code, codeError: "" }, () => {
      refs.code[Math.min(digits.length, 5)]?.current?.focus();

      if (digits.length >= 6) checkCode();
    });
  };

  const setCode = (index: number, value: string) => {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length > 1) return fillCode(digits);

    setState(
      ({ code }) => {
        const next = code.slice();

        next[index] = digits;

        return { code: next, codeError: "" };
      },
      () => {
        if (digits && index < 5) refs.code[index + 1]?.current?.focus();

        if (
          digits &&
          index === 5 &&
          stateRef.current.code.join("").length === 6
        )
          checkCode();
      },
    );
  };

  return {
    saveEdit,
    checkCode,
    setCode,
    fillCode,
    pasteCode: (event: ClipboardEvent) => {
      const digits = (event.clipboardData.getData("text") || "").replace(
        /\D/g,
        "",
      );

      if (!digits) return;

      event.preventDefault();
      fillCode(digits);
    },
    codeKey: (index: number, event: KeyboardEvent) => {
      const { code } = stateRef.current;

      if (event.key === "Backspace" && !code[index] && index > 0) {
        event.preventDefault();
        refs.code[index - 1]?.current?.focus();
      }

      if (event.key === "Enter") checkCode();
    },
  };
};
