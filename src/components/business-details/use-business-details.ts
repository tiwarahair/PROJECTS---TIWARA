import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { RegisterOptions } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatPostcode } from "../../utils/address";
import type { EmittedAddress } from "../address-finder/use-address-finder";
import { cleanVatInput } from "./display";
import { getInitialBusiness, toBusinessValue } from "./initial";
import { businessSchema } from "./schema";
import type {
  BusinessDetailsProps,
  BusinessFieldName,
  BusinessFormValues,
  BusinessType,
  FieldView,
} from "./types";

const TOAST_MS = 2400;

type FieldOptions = Pick<
  RegisterOptions<BusinessFormValues>,
  "onChange" | "onBlur"
>;

export const useBusinessDetails = ({
  preset = "shop",
  scrollTo = "",
  embedded = false,
  value,
  onSave,
  onState,
}: BusinessDetailsProps) => {
  const uid = `bd${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [initial] = useState(() => getInitialBusiness(preset, value));
  const [addressSource, setAddressSource] = useState(initial.addressSource);
  const [isToastShown, setIsToastShown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);

  const {
    control,
    register,
    setValue,
    trigger,
    getFieldState,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<BusinessFormValues>({
    defaultValues: initial.saved,
    resolver: zodResolver(businessSchema),
    mode: "onTouched",
  });

  const [type, vatOn, address, vat] = useWatch({
    control,
    name: ["type", "vatOn", "address", "vat"],
    defaultValue: initial.values,
  });

  const getError = (name: BusinessFieldName) => errors[name]?.message ?? "";

  const revalidate = (names: BusinessFieldName[]) => {
    const shown = names.filter(
      (name) => isSubmitted || getFieldState(name).error,
    );

    if (shown.length) void trigger(shown);
  };

  const submit = handleSubmit((values) => {
    window.clearTimeout(toastTimer.current);
    onSave?.(toBusinessValue(values));
    reset(values);

    // inside Studio the host shows its own toast
    if (embedded) return;

    setIsToastShown(true);

    toastTimer.current = window.setTimeout(
      () => setIsToastShown(false),
      TOAST_MS,
    );
  });

  const save = () => void submit();

  // report after every render (on mount and on every update)
  useEffect(() => {
    onState?.({ canSave: isDirty, save });
  });

  useEffect(() => {
    reset(initial.values, { keepDefaultValues: true });

    if (initial.shownErrors.length) void trigger(initial.shownErrors);

    const element = scrollRef.current;

    const target = scrollTo
      ? element?.querySelector<HTMLElement>(`[data-sec="${scrollTo}"]`)
      : null;

    if (element && target)
      element.scrollTop = Math.max(0, target.offsetTop - 12);

    return () => window.clearTimeout(toastTimer.current);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getField = (
    name: "basePostcode" | "phone" | "email",
    label: string,
    options: FieldOptions = {},
  ): FieldView => ({
    id: `${uid}-${name}`,
    errorId: `${uid}-${name}-e`,
    label,
    error: getError(name),
    input: register(name, options),
  });

  return {
    uid,
    scrollRef,
    type,
    vatOn,
    address,
    addressSource,
    vat,
    isDirty,
    isToastShown,
    errorCount: Object.keys(errors).length,
    getError,
    save,
    pickType: (picked: BusinessType) => {
      setValue("type", picked, { shouldDirty: true });
      revalidate(["address", "basePostcode"]);
    },
    toggleVat: () => {
      setValue("vatOn", !vatOn, { shouldDirty: true });
      revalidate(["vat"]);
    },
    setAddress: (picked: EmittedAddress | null) => {
      setAddressSource(picked ? picked.source : "");

      setValue(
        "address",
        {
          line1: picked?.line1 ?? "",
          line2: picked?.line2 ?? "",
          city: picked?.town ?? "",
          postcode: picked?.postcode ?? "",
        },
        { shouldDirty: true },
      );

      revalidate(["address"]);
    },
    vatInput: register("vat", {
      onChange: (event: { target: { value: string } }) =>
        setValue("vat", cleanVatInput(event.target.value), {
          shouldDirty: true,
        }),
    }),
    radiusInput: register("radius"),
    getContactField: (name: "phone" | "email", label: string) =>
      getField(name, label, {
        onChange: () => revalidate([name === "phone" ? "email" : "phone"]),
      }),
    getBasePostcodeField: () =>
      getField("basePostcode", "Base postcode", {
        onBlur: (event: { target: { value: string } }) =>
          setValue("basePostcode", formatPostcode(event.target.value), {
            shouldDirty: true,
          }),
      }),
  };
};

export type BusinessDetailsController = ReturnType<typeof useBusinessDetails>;
