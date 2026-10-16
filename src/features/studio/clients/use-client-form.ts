import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema } from "./client-schema";
import type { ClientValues } from "./client-schema";

export const useClientForm = (values: ClientValues, isOpen: boolean) => {
  const form = useForm<ClientValues>({
    values,
    resetOptions: { keepErrors: true, keepIsSubmitted: true },
    resolver: zodResolver(clientSchema),
  });

  const {
    reset,
    trigger,
    formState: { isSubmitted },
  } = form;

  const { first, phone, email } = values;

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  useEffect(() => {
    if (isSubmitted) void trigger();
  }, [first, phone, email, isSubmitted, trigger]);

  return form;
};

export type ClientForm = ReturnType<typeof useClientForm>;
