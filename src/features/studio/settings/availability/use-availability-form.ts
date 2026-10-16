import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { WorkingHours } from "../../core/types";
import { availabilitySchema } from "./schema";
import type { AvailabilityValues } from "./schema";

export const AVAILABILITY_FORM_ID = "availability-form";

export const useAvailabilityForm = (hours: WorkingHours[]) => {
  const form = useForm<AvailabilityValues>({
    values: { hours },
    resetOptions: { keepErrors: true },
    resolver: zodResolver(availabilitySchema),
  });

  const { trigger } = form;

  useEffect(() => {
    void trigger();
  }, [hours, trigger]);

  return form;
};
