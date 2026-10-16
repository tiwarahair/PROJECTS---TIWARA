import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkPassword, getPasswordView } from "../../utils/password";
import type { PasswordCheckOptions } from "../../utils/password";
import { getInitialPassword, getPasswordSchema } from "./password-schema";
import type { PasswordValues } from "./password-schema";

interface PasswordFormOptions {
  search: string;
  isCodeSent: boolean;
  checkOptions: PasswordCheckOptions;
}

export const usePasswordForm = ({
  search,
  isCodeSent,
  checkOptions,
}: PasswordFormOptions) => {
  const passwordForm = useForm<PasswordValues>({
    defaultValues: getInitialPassword(search),
    resolver: zodResolver(getPasswordSchema(isCodeSent, checkOptions)),
  });

  const {
    watch,
    formState: { errors, isSubmitted, touchedFields },
  } = passwordForm;

  const [code, next, confirm] = watch(["code", "next", "confirm"]);
  const passwordCheck = checkPassword(next, checkOptions);

  const passwordView = getPasswordView(passwordCheck, {
    show: isSubmitted || (!!touchedFields.next && !!next),
    errorColour: "var(--accent-700)",
  });

  return {
    passwordForm,
    passwordView,
    passwordErrors: {
      code: errors.code?.message ?? "",
      next: passwordView.hasError ? passwordCheck.error : "",
      confirm: errors.confirm?.message ?? "",
      server: errors.root?.message ?? "",
    },
    isPasswordFilled: !!(code || next || confirm),
  };
};
