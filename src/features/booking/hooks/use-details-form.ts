import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { detailsSchema } from "../logic/schemas";
import type { Details } from "../logic/types";
import type { FlowState } from "./use-flow-state";

export const useDetailsForm = ({ initial, setState }: FlowState) => {
  const detailsForm = useForm<Details>({
    defaultValues: initial.details,
    mode: "onTouched",
    resolver: zodResolver(detailsSchema),
    shouldFocusError: false,
  });

  useEffect(() => {
    const { unsubscribe } = detailsForm.watch(() =>
      setState({ details: detailsForm.getValues() }),
    );

    return unsubscribe;
  }, [detailsForm, setState]);

  return detailsForm;
};
