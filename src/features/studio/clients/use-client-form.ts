import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema } from "./client-schema";
import type { ClientValues } from "./client-schema";

export const useClientForm = (values: ClientValues, isOpen: boolean) => {
  const form = useForm<ClientValues>({
    values,
    resolver: zodResolver(clientSchema),
  });

  const { reset } = form;

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  return form;
};

export type ClientForm = ReturnType<typeof useClientForm>;
