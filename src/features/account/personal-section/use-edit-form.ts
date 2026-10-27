import { useFormState } from "react-hook-form";
import type { Profile } from "../data";
import type { AccountController } from "../use-account";
import ui from "../../../styles/features/account/ui.module.css";

export const useEditForm = (account: AccountController) => {
  const { actions, forms } = account;
  const { errors } = useFormState({ control: forms.edit.control });

  return {
    ...account,
    form: forms.edit,
    errors,
    getBorderClass: (key: keyof Profile) =>
      errors[key] ? ui.inputErr : ui.inputOk,
    cancelEdit: () => {
      actions.stopResendCountdown();
      forms.edit.clearErrors();
      actions.setState({ edit: null, emailStep: "" });
    },
  };
};

export type EditFormController = ReturnType<typeof useEditForm>;
