import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StudioController } from "../../core/use-studio";
import { getTwoFactorSchema } from "./schema";
import type { TwoFactorValues } from "./schema";

export const useTwoFactorForm = ({ state }: StudioController) => {
  const flow = state.twoFactor;

  const deviceNames = (state.twoFactorSettings?.devices ?? []).map(({ name }) =>
    name.toLowerCase(),
  );

  const form = useForm<TwoFactorValues>({
    values: { name: flow?.name ?? "", code: flow?.code ?? "" },
    resolver: zodResolver(
      getTwoFactorSchema({ isNaming: flow?.step === "app", deviceNames }),
    ),
    reValidateMode: "onSubmit",
  });

  const { reset } = form;

  useEffect(() => {
    reset();
  }, [flow?.step, reset]);

  return form;
};
