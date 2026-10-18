import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  getAddressKey,
  getInitialTax,
  getTaxBusiness,
  getTaxOutput,
} from "./logic";
import type { TaxFormValues } from "./logic";
import { getTaxSchema } from "./schema";
import type { TaxDetailsFormProps } from "./types";

type TaxErrorName =
  | "first"
  | "last"
  | "day"
  | "companyName"
  | "companyNumber"
  | "nationalInsuranceNumber";

export const useTaxDetails = ({
  mode = "setup",
  fixture = "",
  legalName = "Amara Okonkwo",
  businessName = "Tiwára's House Ltd",
  business,
  value,
  onSubmit,
  onDirtyChange,
}: TaxDetailsFormProps) => {
  const uid = `tx${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const [initial] = useState(() =>
    getInitialTax({ fixture, businessName, business, value }),
  );

  const [showNationalInsurance, setShowNationalInsurance] = useState(
    initial.showNationalInsurance,
  );

  const dobRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<TaxFormValues>({
    defaultValues: initial.values,
    mode: "onTouched",
    resolver: zodResolver(getTaxSchema(initial.nationalInsuranceHint)),
  });

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  useEffect(() => {
    if (initial.shownErrors.length) void trigger(initial.shownErrors);
  }, [initial, trigger]);

  const [kind, nameYes] = useWatch({ control, name: ["kind", "nameYes"] });
  const isSole = kind === "sole";
  const addressKey = getAddressKey(kind);

  const [isSame, addressSource] = useWatch({
    control,
    name: [`${addressKey}.same`, `${addressKey}.src`],
  });

  const { type, details } = getTaxBusiness(business);

  const getError = (name: TaxErrorName) => errors[name]?.message ?? "";

  const submit = handleSubmit((values) =>
    onSubmit?.(getTaxOutput(values, legalName, business)),
  );

  return {
    form,
    errors,
    getError,
    initial,
    legalName,
    kind,
    nameYes,
    isSole,
    addressKey,
    isSame,
    addressSource,
    dobRefs,
    showNationalInsurance,
    toggleNationalInsurance: () =>
      setShowNationalInsurance((isShown) => !isShown),
    fieldId: (key: string) => `${uid}-${key}`,
    showSame: isSole ? type === "home" : type === "home" || type === "shop",
    sameText: [details.line1, details.line2, details.city, details.postcode]
      .filter(Boolean)
      .join(", "),
    isSettings: mode === "settings",
    save: () => void submit(),
  };
};

export type TaxDetailsController = ReturnType<typeof useTaxDetails>;
