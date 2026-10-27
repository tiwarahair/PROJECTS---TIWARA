import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { Profile } from "./data";
import type { EditKey } from "./logic";
import { addressSchema, getEditSchema, getPasswordSchema } from "./schemas";
import type { AddressFormValues, PasswordFormValues } from "./schemas";

interface FormContext {
  edit: EditKey | null;
  profile: Profile;
  isCodeSent: boolean;
}

export const EMPTY_PASSWORD: PasswordFormValues = { code: "", next: "" };

export const useAccountForms = (
  draft: Profile,
  getContext: () => FormContext,
) => {
  const edit = useForm<Profile>({
    defaultValues: draft,
    resolver: (values, context, options) => {
      const { edit: key, profile } = getContext();

      return zodResolver(getEditSchema(key ?? "name", profile.email))(
        values,
        context,
        options,
      );
    },
  });

  const password = useForm<PasswordFormValues>({
    defaultValues: EMPTY_PASSWORD,
    mode: "onTouched",
    reValidateMode: "onSubmit",
    resolver: (values, context, options) => {
      const { isCodeSent, profile } = getContext();

      return zodResolver(getPasswordSchema(isCodeSent, profile))(
        values,
        context,
        options,
      );
    },
  });

  const address = useForm<AddressFormValues>({
    defaultValues: { label: "", address: null, isDefault: false },
    resolver: zodResolver(addressSchema),
  });

  return useMemo(
    () => ({ edit, password, address }),
    [edit, password, address],
  );
};

export type AccountForms = ReturnType<typeof useAccountForms>;
