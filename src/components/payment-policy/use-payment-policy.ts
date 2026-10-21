import { useEffect, useId, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { policySchema } from "./schema";
import { EXTRAS_LIMIT, getExtrasUsed } from "./summary";
import type {
  ExtraType,
  FeeName,
  FeeValues,
  PaymentPolicyProps,
  PolicyFormValues,
} from "./types";
import { getPolicyOutput, toPolicyFormValues } from "./values";

const FLASH_MS = 1800;

const getDigits = (value: string) => value.replace(/\D/g, "").slice(0, 3);

export const usePaymentPolicy = ({
  value,
  onSave,
  onState,
}: PaymentPolicyProps) => {
  const uid = `pp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [initial] = useState(() => toPolicyFormValues(value));
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimer = useRef(0);

  const {
    control,
    register,
    setValue,
    getValues,
    trigger,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PolicyFormValues>({
    defaultValues: initial,
    resolver: zodResolver(policySchema),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "extras" });
  const policy = watch();
  const used = getExtrasUsed(policy.extras);
  const isFull = used >= EXTRAS_LIMIT;

  const getError = (name: "deposit" | FeeName) => errors[name]?.message ?? "";

  const hasError = !!(errors.deposit || errors.late || errors.noShow);
  const canSave = isDirty && !hasError;

  const submit = handleSubmit((submitted) => {
    const markSaved = () => {
      window.clearTimeout(flashTimer.current);

      const current = getValues();

      reset(submitted);

      if (JSON.stringify(current) !== JSON.stringify(submitted))
        reset(current, { keepDefaultValues: true });

      setIsFlashing(true);

      flashTimer.current = window.setTimeout(
        () => setIsFlashing(false),
        FLASH_MS,
      );
    };

    const result = onSave?.(getPolicyOutput(submitted));

    if (result instanceof Promise)
      void result.then((isSaved) => isSaved && markSaved());
    else markSaved();
  });

  const save = () => {
    if (canSave) void submit();
  };

  // tells the host (Studio) whether a save is possible, so its own header button can mirror the state
  useEffect(() => {
    onState?.({ canSave, isDirty, save });
  });

  useEffect(() => {
    void trigger();

    const subscription = watch(() => void trigger());

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(flashTimer.current);
    };
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    uid,
    policy,
    fields,
    used,
    isFull,
    isDirty,
    isFlashing,
    hasError,
    canSave,
    save,
    getError,
    setMode: (mode: PolicyFormValues["mode"]) =>
      setValue("mode", mode, { shouldDirty: true }),
    setRefundable: (refundable: boolean) =>
      setValue("refundable", refundable, { shouldDirty: true }),
    setWindow: (hours: string) =>
      setValue("freeWindowHours", parseFloat(hours), { shouldDirty: true }),
    setGrace: (minutes: string) =>
      setValue("grace", parseInt(minutes, 10), { shouldDirty: true }),
    depositInput: register("deposit", {
      onChange: (event: { target: { value: string } }) =>
        setValue("deposit", getDigits(event.target.value), {
          shouldDirty: true,
        }),
    }),
    updateFee: (name: FeeName) => (patch: Partial<FeeValues>) =>
      setValue(name, { ...getValues(name), ...patch }, { shouldDirty: true }),
    getPercentInput: (name: FeeName) =>
      register(`${name}.percent`, {
        onChange: (event: { target: { value: string } }) => {
          setValue(`${name}.percent`, getDigits(event.target.value), {
            shouldDirty: true,
          });

          setValue(`${name}.kind`, "pct", { shouldDirty: true });
        },
      }),
    getExtraInput: (index: number) =>
      register(`extras.${index}.text`, {
        onChange: (event: { target: { value: string } }) => {
          const others = getValues("extras").filter(
            (_extra, position) => position !== index,
          );

          const room = EXTRAS_LIMIT - getExtrasUsed(others);

          setValue(`extras.${index}.text`, event.target.value.slice(0, room), {
            shouldDirty: true,
          });
        },
      }),
    addExtra: (type: ExtraType) => {
      if (!isFull) append({ type, text: "" });
    },
    removeExtra: remove,
  };
};

export type PaymentPolicyController = ReturnType<typeof usePaymentPolicy>;
