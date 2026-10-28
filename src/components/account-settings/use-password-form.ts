import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkPassword, getPasswordView } from "../../utils/password";
import type { PasswordCheckOptions } from "../../utils/password";
import { EMPTY_PASSWORD, getPasswordSchema } from "./password-schema";
import type { PasswordValues } from "./password-schema";

interface PasswordFormOptions {
  isCodeSent: boolean;
  checkOptions: PasswordCheckOptions;
}

export const usePasswordForm = ({
  isCodeSent,
  checkOptions,
}: PasswordFormOptions) => {
  const passwordForm = useForm<PasswordValues>({
    defaultValues: EMPTY_PASSWORD,
    resolver: zodResolver(getPasswordSchema(isCodeSent, checkOptions)),
  });

  const {
    watch,
    formState: { errors, isSubmitted, touchedFields },
  } = passwordForm;

  const [code, newPassword, confirm] = watch([
    "code",
    "newPassword",
    "confirm",
  ]);

  const passwordCheck = checkPassword(newPassword, checkOptions);

  const passwordView = getPasswordView(passwordCheck, {
    show: isSubmitted || (!!touchedFields.newPassword && !!newPassword),
    errorColour: "var(--accent-700)",
  });

  return {
    passwordForm,
    passwordView,
    passwordErrors: {
      code: errors.code?.message ?? "",
      newPassword: passwordView.hasError ? passwordCheck.error : "",
      confirm: errors.confirm?.message ?? "",
      server: errors.root?.message ?? "",
    },
    isPasswordFilled: !!(code || newPassword || confirm),
  };
};
