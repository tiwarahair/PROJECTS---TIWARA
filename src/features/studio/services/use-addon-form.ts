import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addonSchema } from "./addon-schema";
import type { AddonValues } from "./addon-schema";

export const useAddonForm = (name: string, isOpen: boolean) => {
  const form = useForm<AddonValues>({
    values: { name },
    resolver: zodResolver(addonSchema),
  });

  const { reset } = form;

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  return form;
};

export type AddonForm = ReturnType<typeof useAddonForm>;
