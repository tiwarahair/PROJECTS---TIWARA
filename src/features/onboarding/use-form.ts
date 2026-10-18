import { useEffect } from "react";
import type { FieldPath, PathValue } from "react-hook-form";
import type { FieldBinding } from "./fields";
import type { OnboardingForm } from "./state";
import type { OnboardingBase } from "./use-base";

/** Form fields typed into text inputs. */
type TextFieldName = {
  [K in keyof OnboardingForm]: OnboardingForm[K] extends string ? K : never;
}[keyof OnboardingForm];

export const useOnboardingForm = (
  {
    startTouched,
    stateRef,
    identity,
    isUpgrade,
    formApi,
    form,
    formStateRef,
    setState,
  }: OnboardingBase,
  save: () => void,
) => {
  const { formState, register, setValue, trigger, watch } = formApi;

  // an empty field that loses focus isn't wrong yet: errors show once it's been changed, or on Continue
  const getShownErrors = () => {
    const { errors, dirtyFields, isSubmitted } = formState;

    return Object.fromEntries(
      Object.entries(errors).filter(
        ([key]) => isSubmitted || key in dirtyFields,
      ),
    );
  };

  /** Binds a text input: react-hook-form tracks it, checking it on blur and then as it changes. */
  const field = (name: TextFieldName): FieldBinding => ({
    ...register(name),
    value: form[name],
  });

  /** Buttons and checkboxes set their value directly (touch: check it straight away). */
  const setField = <K extends FieldPath<OnboardingForm>>(
    key: K,
    value: PathValue<OnboardingForm, K>,
    touch = false,
  ) =>
    setValue(key, value, {
      shouldTouch: touch,
      shouldDirty: touch,
      shouldValidate: touch,
    });

  // any change: clear its server error, re-check what's already showing, save wizard progress
  useEffect(() => {
    const { unsubscribe } = watch((_values, { name }) => {
      if (!name) return;

      const { touchedFields, errors, isSubmitted } = formStateRef.current;
      const shown = Object.keys({ ...touchedFields, ...errors });

      if (isSubmitted) void trigger();
      else if (shown.length) void trigger(shown as FieldPath<OnboardingForm>[]);

      setState(
        (current) => ({
          failure: null,
          serverErrors: {
            ...current.serverErrors,
            [name]: undefined,
            exists: undefined,
            noBusiness: undefined,
          },
        }),
        () => {
          if (stateRef.current.screen?.[0] === "w") save();
        },
      );
    });

    return unsubscribe;
  }, [watch, trigger, setState, save, formStateRef, stateRef]);

  // fixture boards open with some fields already showing their errors
  useEffect(() => {
    const keys = Object.keys(startTouched) as FieldPath<OnboardingForm>[];

    if (keys.length) void trigger(keys);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a signed-in account's own details fill (and lock) the account step
  const { first, last, email, mobile } = identity ?? {};

  useEffect(() => {
    if (!isUpgrade || !identity?.isLoaded) return;

    setValue("first", first ?? "");
    setValue("last", last ?? "");
    setValue("email", email ?? "");
    setValue("mobile", mobile ?? "");
    // only a newly loaded identity refills the fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpgrade, identity?.isLoaded]);

  return { getShownErrors, field, setField };
};
