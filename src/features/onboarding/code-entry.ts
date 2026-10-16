import type { ClipboardEvent, KeyboardEvent } from "react";
import { EMPTY_CODE } from "./onboarding-state";
import type { OnboardingBase } from "./use-base";

export const getCodeEntry = (
  { codeRefs, stateRef, setState }: OnboardingBase,
  submit: () => void,
) => {
  /** One digit per box: advance on input, submit when all six are filled. */
  const setCodeDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "");

    setState(
      (current) => {
        const code = current.code.slice();

        code[index] = digit.slice(-1);

        return { code, codeError: "" };
      },
      () => {
        if (digit && index < 5) codeRefs[index + 1]?.current?.focus();

        if (digit && index === 5 && stateRef.current.code.every(Boolean))
          submit();
      },
    );
  };

  const handleCodeKey = (index: number, event: KeyboardEvent) => {
    const { code } = stateRef.current;

    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeRefs[index - 1]?.current?.focus();
      setCodeDigit(index - 1, "");
    } else if (event.key === "ArrowLeft" && index > 0)
      codeRefs[index - 1]?.current?.focus();
    else if (event.key === "ArrowRight" && index < 5)
      codeRefs[index + 1]?.current?.focus();
    else if (event.key === "Enter") submit();
  };

  const pasteCode = (event: ClipboardEvent) => {
    const text = (event.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!text.length) return;

    event.preventDefault();
    const code = EMPTY_CODE.slice();

    text.split("").forEach((digit, index) => (code[index] = digit));

    setState({ code, codeError: "" }, () => {
      codeRefs[Math.min(5, text.length)]?.current?.focus();

      if (text.length === 6) submit();
    });
  };

  return { setCodeDigit, handleCodeKey, pasteCode };
};
