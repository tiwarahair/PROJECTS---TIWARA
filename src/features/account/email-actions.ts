// The email change: Supabase emails a code to the current address and one to the new address; both confirm it.
import type { ClipboardEvent, KeyboardEvent } from "react";
import {
  EMAIL_CODE_FAILURES,
  sendEmailChangeCodes,
  verifyEmailChangeCode,
} from "../../lib/account-changes";
import { EMPTY_CODES } from "./state";
import type { CodeRow, CodeTarget } from "./state";
import type { AccountCore } from "./use-core";
import type { AccountFeedback } from "./use-feedback";

const TARGETS: CodeTarget[] = ["current", "next"];

export const getEmailActions = (
  { stateRef, setState, forms, refs, emailCheck }: AccountCore,
  { focusLater, showToast, startResendCountdown }: AccountFeedback,
) => {
  const setRow = (
    target: CodeTarget,
    patch: Partial<CodeRow>,
    callback?: () => void,
  ) =>
    setState(
      ({ codes }) => ({
        codes: { ...codes, [target]: { ...codes[target], ...patch } },
      }),
      callback,
    );

  /** An error message when the codes couldn't be sent. */
  const sendCodes = async (email: string) => {
    const failure = await sendEmailChangeCodes(email).catch(() => "failed");

    if (failure)
      return EMAIL_CODE_FAILURES[failure] ?? EMAIL_CODE_FAILURES.failed ?? "";

    emailCheck.current.confirmed.clear();

    setState(
      {
        emailStep: "code",
        pendingEmail: email,
        codes: EMPTY_CODES,
        resendIn: 30,
      },
      () => focusLater("code"),
    );

    startResendCountdown();

    return "";
  };

  const finish = () => {
    const { profile, pendingEmail = "" } = stateRef.current;

    emailCheck.current.confirmed.clear();

    forms.edit.reset({ ...profile, email: pendingEmail });

    setState({
      profile: { ...profile, email: pendingEmail },
      pendingEmail: "",
      edit: null,
      emailStep: "",
      codes: EMPTY_CODES,
    });

    showToast("Your email is updated");
  };

  const verifyRow = async (target: CodeTarget) => {
    const { confirmed } = emailCheck.current;
    const { profile, pendingEmail = "", codes } = stateRef.current;
    const row = codes[target];
    const code = row.digits.join("");

    if (confirmed.has(target)) return true;

    if (code.length < 6) {
      setRow(target, { error: "Enter the 6-digit code" });

      return false;
    }

    const email = target === "current" ? profile.email : pendingEmail;
    const isRight = await verifyEmailChangeCode(email, code).catch(() => false);

    if (!isRight) {
      setRow(target, {
        error: "That code isn’t right or has expired.",
        shake: row.shake + 1,
      });

      return false;
    }

    confirmed.add(target);

    if (confirmed.size === TARGETS.length) finish();
    else
      setRow(target, { confirmed: true, error: "" }, () => focusLater("code"));

    return true;
  };

  // one check at a time, like the stylist's email change: Supabase confirms the two codes in turn
  const checkCode = (target: CodeTarget) => {
    const check = emailCheck.current.queue.then(() => verifyRow(target));

    emailCheck.current.queue = check.then(() => undefined);

    return check;
  };

  const fillCode = (target: CodeTarget, digits: string) => {
    const code = digits.slice(0, 6).split("");

    while (code.length < 6) code.push("");

    setRow(target, { digits: code, error: "" }, () => {
      refs.codes[target][Math.min(digits.length, 5)]?.current?.focus();

      if (digits.length >= 6) void checkCode(target);
    });
  };

  const setCode = (target: CodeTarget, index: number, value: string) => {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length > 1) return fillCode(target, digits);

    const code = stateRef.current.codes[target].digits.slice();

    code[index] = digits;

    setRow(target, { digits: code, error: "" }, () => {
      if (digits && index < 5) refs.codes[target][index + 1]?.current?.focus();

      if (digits && code.join("").length === 6) void checkCode(target);
    });
  };

  return {
    sendCodes,
    checkCode,
    setCode,
    confirmCodes: async () => {
      for (const target of TARGETS) if (!(await checkCode(target))) return;
    },
    resendCodes: async () => {
      const message = await sendCodes(stateRef.current.pendingEmail ?? "");

      showToast(message || "We sent new codes");
    },
    pasteCode: (target: CodeTarget, event: ClipboardEvent) => {
      const digits = (event.clipboardData.getData("text") || "").replace(
        /\D/g,
        "",
      );

      if (!digits) return;

      event.preventDefault();
      fillCode(target, digits);
    },
    codeKey: (target: CodeTarget, index: number, event: KeyboardEvent) => {
      const { digits } = stateRef.current.codes[target];

      if (event.key === "Backspace" && !digits[index] && index > 0) {
        event.preventDefault();
        refs.codes[target][index - 1]?.current?.focus();
      }

      if (event.key === "Enter") void checkCode(target);
    },
  };
};

export type EmailActions = ReturnType<typeof getEmailActions>;
