import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StudioController } from "../../core/use-studio";
import { getWizardSchema } from "./schema";
import type { WizardValues } from "./schema";

export const useWizardForm = ({ state }: StudioController) => {
  const wizard = state.sheet === "svcwiz" ? state.wizard : null;
  const draft = wizard?.draft;
  const isEdit = wizard?.mode === "edit";

  const form = useForm<WizardValues>({
    values: {
      name: draft?.name ?? "",
      typeId: draft?.taxonomyId ? (draft.typeId ?? "") : "",
      price: String(draft?.price ?? ""),
      durationHours: String(draft?.durationHours ?? ""),
      durationMinutes: String(draft?.durationMinutes ?? ""),
    },
    resolver: zodResolver(
      getWizardSchema({
        isDetails: isEdit || wizard?.step === 2,
        isPricing: isEdit || (wizard?.step === 3 && !wizard.review),
      }),
    ),
  });

  const { reset } = form;
  const isOpen = !!wizard && !state.out;

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  return form;
};

export type WizardForm = ReturnType<typeof useWizardForm>;
