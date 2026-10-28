import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StudioController } from "../../core/use-studio";
import { getWizardSchema } from "./schema";
import type { WizardValues } from "./schema";

export const useWizardForm = ({ state }: StudioController) => {
  const wizard = state.sheet === "svcwiz" ? state.wizard : null;
  const draft = wizard?.draft;
  const isEdit = wizard?.mode === "edit";

  const values = {
    name: draft?.name ?? "",
    typeId: draft?.taxonomyId ? (draft.typeId ?? "") : "",
    price: String(draft?.price ?? ""),
    durationHours: String(draft?.durationHours ?? ""),
    durationMinutes: String(draft?.durationMinutes ?? ""),
  };

  const form = useForm<WizardValues>({
    values,
    resetOptions: { keepErrors: true, keepIsSubmitted: true },
    resolver: zodResolver(
      getWizardSchema({
        isDetails: isEdit || wizard?.step === 2,
        isPricing: isEdit || (wizard?.step === 3 && !wizard.review),
      }),
    ),
  });

  const {
    reset,
    trigger,
    formState: { isSubmitted },
  } = form;

  const isOpen = !!wizard && !state.out;
  const { name, typeId, price, durationHours, durationMinutes } = values;

  const resetStep = useCallback(
    () => reset(undefined, { keepErrors: false, keepIsSubmitted: false }),
    [reset],
  );

  useEffect(() => {
    if (!isOpen) resetStep();
  }, [isOpen, resetStep]);

  useEffect(() => {
    if (!isEdit) resetStep();
  }, [wizard?.step, wizard?.review, isEdit, resetStep]);

  useEffect(() => {
    if (isSubmitted) void trigger();
  }, [
    name,
    typeId,
    price,
    durationHours,
    durationMinutes,
    isSubmitted,
    trigger,
  ]);

  return form;
};

export type WizardForm = ReturnType<typeof useWizardForm>;
