import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { Profile } from "./account-data";
import type { EditKey } from "./account-logic";
import {
  addressSchema,
  cardSchema,
  getEditSchema,
  getPasswordSchema,
} from "./account-schemas";
import type {
  AddressFormValues,
  CardFormValues,
  PasswordFormValues,
} from "./account-schemas";

interface FormContext {
  edit: EditKey | null;
  profile: Profile;
  hasPassword: boolean;
}

export const EMPTY_CARD: CardFormValues = {
  number: "",
  expiry: "",
  cvc: "",
  isDefault: false,
};

export const EMPTY_PASSWORD: PasswordFormValues = { current: "", next: "" };

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
      const { hasPassword, profile } = getContext();

      return zodResolver(getPasswordSchema(hasPassword, profile))(
        values,
        context,
        options,
      );
    },
  });

  const card = useForm<CardFormValues>({
    defaultValues: EMPTY_CARD,
    reValidateMode: "onSubmit",
    resolver: zodResolver(cardSchema),
  });

  const address = useForm<AddressFormValues>({
    defaultValues: { label: "", address: null, isDefault: false },
    resolver: zodResolver(addressSchema),
  });

  return useMemo(
    () => ({ edit, password, card, address }),
    [edit, password, card, address],
  );
};

export type AccountForms = ReturnType<typeof useAccountForms>;
