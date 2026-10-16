import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Eye, EyeOff, Lock } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { AddressFinder } from "../address-finder";
import { DOB_PARTS, Field, KINDS } from "./tax-details-field";
import {
  getAddressKey,
  getBlankAddress,
  getInitialTax,
  getTaxBusiness,
  getTaxOutput,
  formatNationalInsuranceNumber,
} from "./tax-details-logic";
import type {
  TaxBusiness,
  TaxDetails,
  TaxFixture,
  TaxFormValues,
} from "./tax-details-logic";
import { getTaxSchema } from "./tax-details-schema";
import styles from "../../styles/components/tax-details-form/tax-details-form.module.css";

export interface TaxDetailsFormProps {
  mode?: "setup" | "settings";
  fixture?: TaxFixture;
  legalName?: string;
  businessName?: string;
  business?: TaxBusiness;
  value?: Partial<TaxDetails>;
  onSubmit?: (details: TaxDetails) => void;
  onCancel?: () => void;
  /** Whether the fields differ from how the form opened. */
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * Legal and tax details before Stripe payouts (embedded in Studio):
 * sole trader (legal name, date of birth, home address, NI number) or limited company (name, number,
 * registered office).
 */
export const TaxDetailsForm = ({
  mode = "setup",
  fixture = "",
  legalName = "Amara Okonkwo",
  businessName = "Tiwára's House Ltd",
  business,
  value,
  onSubmit,
  onCancel,
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

  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    trigger,
    getFieldState,
    formState: { errors, isDirty },
  } = useForm<TaxFormValues>({
    defaultValues: initial.values,
    mode: "onTouched",
    resolver: zodResolver(getTaxSchema(initial.nationalInsuranceHint)),
  });

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

  const fieldId = (key: string) => `${uid}-${key}`;
  const { type, details } = getTaxBusiness(business);

  const showSame = isSole
    ? type === "home"
    : type === "home" || type === "shop";

  const sameText = [
    details.line1,
    details.line2,
    details.city,
    details.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const dobError = errors.day?.message ?? "";
  const nationalInsuranceError = errors.nationalInsuranceNumber?.message ?? "";
  const isSettings = mode === "settings";

  const submit = handleSubmit((values) =>
    onSubmit?.(getTaxOutput(values, legalName, business)),
  );

  return (
    <div className={styles.form} data-screen-label="Tax details form">
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>How is your business set up?</legend>
        <div className={styles.kinds} role="radiogroup">
          {KINDS.map(([tileKind, label]) => {
            const isOn = kind === tileKind;

            return (
              <button
                key={tileKind}
                className={joinClassNames(
                  styles.tile,
                  isOn ? styles.tileOn : styles.tileOff,
                )}
                role="radio"
                aria-checked={isOn ? "true" : "false"}
                onClick={() => {
                  setValue("kind", tileKind, { shouldDirty: true });
                  clearErrors();
                }}
              >
                <span
                  className={joinClassNames(
                    styles.tileLabel,
                    isOn ? styles.tileLabelOn : styles.tileLabelOff,
                  )}
                >
                  {label}
                </span>
                <span
                  className={joinClassNames(
                    styles.ring,
                    isOn ? styles.ringOn : styles.ringOff,
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={joinClassNames(
                      styles.dot,
                      isOn ? styles.dotOn : styles.dotOff,
                    )}
                  ></span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {isSole && (
        <div className={styles.group}>
          <div>
            <div className={styles.question} id={fieldId("nq")}>
              {`Is ${legalName || "this"} your legal name?`}
            </div>
            <div
              className={styles.chips}
              role="radiogroup"
              aria-labelledby={fieldId("nq")}
            >
              {(
                [
                  ["yes", "Yes", true],
                  ["no", "No", false],
                ] as const
              ).map(([key, label, isYes]) => {
                const isOn = nameYes === isYes;

                return (
                  <button
                    key={key}
                    className={joinClassNames(
                      styles.chip,
                      isOn ? styles.chipOn : styles.chipOff,
                    )}
                    role="radio"
                    aria-checked={isOn ? "true" : "false"}
                    onClick={() => {
                      setValue("nameYes", isYes, { shouldDirty: true });

                      if (isYes) clearErrors(["first", "last"]);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {!nameYes && (
              <div className={styles.nameFields} data-tx-anim="1">
                <div className={styles.hint}>
                  As it appears on your passport or driving licence.
                </div>
                <Field
                  id={fieldId("first")}
                  label="Legal first name"
                  error={errors.first?.message ?? ""}
                  inputProps={register("first")}
                  autoComplete="given-name"
                />
                <Field
                  id={fieldId("middle")}
                  label="Middle name(s)"
                  error=""
                  inputProps={register("middle")}
                  autoComplete="additional-name"
                  optional={true}
                />
                <Field
                  id={fieldId("last")}
                  label="Legal last name"
                  error={errors.last?.message ?? ""}
                  inputProps={register("last")}
                  autoComplete="family-name"
                />
                <div className={styles.hint}>
                  Changing it here doesn’t change your account name.
                </div>
              </div>
            )}
          </div>

          <fieldset
            className={styles.fieldset}
            aria-describedby={fieldId("dob-e")}
          >
            <legend className={styles.dobLegend}>Date of birth</legend>
            <div className={styles.dobRow}>
              {DOB_PARTS.map(
                ({ key, placeholder, aria, max, autoComplete }, index) => (
                  <Controller
                    key={key}
                    name={key}
                    control={control}
                    rules={key === "day" ? undefined : { deps: ["day"] }}
                    render={({ field }) => (
                      <input
                        className={joinClassNames(
                          styles.dobInput,
                          max === 4 ? styles.dobLong : styles.dobShort,
                          dobError ? styles.fieldErr : styles.fieldOk,
                        )}
                        name={field.name}
                        ref={(element) => {
                          field.ref(element);
                          dobRefs.current[index] = element;
                        }}
                        value={field.value}
                        onChange={(event) => {
                          const digits = event.target.value
                            .replace(/\D/g, "")
                            .slice(0, max);

                          field.onChange(digits);

                          if (getFieldState("day").error) void trigger("day");

                          if (digits.length === max && index < 2)
                            dobRefs.current[index + 1]?.focus();
                        }}
                        onBlur={field.onBlur}
                        inputMode="numeric"
                        autoComplete={autoComplete}
                        maxLength={max}
                        placeholder={placeholder}
                        aria-label={aria}
                        aria-invalid={dobError ? "true" : "false"}
                      />
                    )}
                  />
                ),
              )}
            </div>
            {!!dobError && (
              <div className={styles.error} role="alert" id={fieldId("dob-e")}>
                {dobError}
              </div>
            )}
          </fieldset>
        </div>
      )}

      {!isSole && (
        <div className={styles.group}>
          <Field
            id={fieldId("coName")}
            label="Company name"
            error={errors.companyName?.message ?? ""}
            inputProps={register("companyName")}
            help="As registered at Companies House."
            placeholder=""
          />
          <Controller
            name="companyNumber"
            control={control}
            render={({ field }) => (
              <Field
                id={fieldId("coNum")}
                label="Company registration number"
                error={errors.companyNumber?.message ?? ""}
                inputProps={{
                  ...field,
                  onChange: (event) =>
                    field.onChange(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 8),
                    ),
                }}
                help="8 characters, like 12345678 or SC123456."
                placeholder="12345678"
                isCode={true}
              />
            )}
          />
        </div>
      )}

      <div>
        <div className={styles.sectionTitle}>
          {isSole ? "Home address" : "Registered office address"}
        </div>
        <div className={styles.sectionHelp}>
          {isSole
            ? "Where you live, not where you work."
            : "The address registered at Companies House."}
        </div>
        {showSame && (
          <>
            <label className={styles.sameLabel}>
              <input
                className={styles.checkbox}
                type="checkbox"
                {...register(`${addressKey}.same`, {
                  deps: [`${addressKey}.fields`],
                })}
              />
              <span>Same as my business address</span>
            </label>
            {isSame && <div className={styles.sameText}>{sameText}</div>}
          </>
        )}
        {!isSame && (
          <div className={styles.finder}>
            {/* host block for the embedded address finder */}
            <div data-dc-host="">
              <Controller
                key={addressKey}
                name={`${addressKey}.fields`}
                control={control}
                render={({ field }) => (
                  <AddressFinder
                    idPrefix={`${uid}-${addressKey}`}
                    label="Address or postcode"
                    value={
                      field.value.line1
                        ? {
                            line1: field.value.line1,
                            line2: field.value.line2,
                            town: field.value.city,
                            postcode: field.value.postcode,
                            source: addressSource || "pick",
                          }
                        : null
                    }
                    onChange={(picked) => {
                      setValue(
                        `${addressKey}.src`,
                        picked ? picked.source : "",
                      );

                      field.onChange(
                        picked
                          ? {
                              line1: picked.line1,
                              line2: picked.line2 || "",
                              city: picked.town,
                              postcode: picked.postcode,
                            }
                          : getBlankAddress(),
                      );
                    }}
                    showErrors={!!errors[addressKey]?.fields}
                    fieldHeight={50}
                    labelSize={13.5}
                  />
                )}
              />
            </div>
          </div>
        )}
      </div>

      {isSole && (
        <div>
          <label className={styles.labelTight} htmlFor={fieldId("ni")}>
            National Insurance number
          </label>
          <div className={styles.help}>
            {initial.nationalInsuranceHint
              ? `Saved: ${initial.nationalInsuranceHint}. Leave blank to keep it.`
              : "Used for tax reporting. It looks like QQ 12 34 56 C."}
          </div>
          <div className={styles.niWrap}>
            <Controller
              name="nationalInsuranceNumber"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  className={joinClassNames(
                    styles.niInput,
                    nationalInsuranceError ? styles.fieldErr : styles.fieldOk,
                  )}
                  id={fieldId("ni")}
                  type={showNationalInsurance ? "text" : "password"}
                  onChange={(event) =>
                    field.onChange(
                      formatNationalInsuranceNumber(event.target.value),
                    )
                  }
                  autoComplete="off"
                  spellCheck="false"
                  placeholder={initial.nationalInsuranceHint || "QQ 12 34 56 C"}
                  aria-invalid={nationalInsuranceError ? "true" : "false"}
                  aria-describedby={fieldId("ni-e")}
                />
              )}
            />
            <button
              className={styles.niToggle}
              onClick={() => setShowNationalInsurance((isShown) => !isShown)}
              aria-label={
                showNationalInsurance
                  ? "Hide National Insurance number"
                  : "Show National Insurance number"
              }
              aria-pressed={showNationalInsurance}
            >
              {!showNationalInsurance && <Eye size={18} strokeWidth={1.7} />}
              {showNationalInsurance && <EyeOff size={18} strokeWidth={1.7} />}
            </button>
          </div>
          {!!nationalInsuranceError && (
            <div className={styles.error} role="alert" id={fieldId("ni-e")}>
              {nationalInsuranceError}
            </div>
          )}
        </div>
      )}

      <div className={styles.note}>
        <Lock className={styles.noteIcon} size={16} strokeWidth={1.6} />
        <span>Stored securely and only shared with HMRC.</span>
      </div>

      <div className={styles.actions}>
        {isSettings && (
          <button className={styles.cancel} onClick={() => onCancel?.()}>
            Cancel
          </button>
        )}
        <button className={styles.submit} onClick={() => void submit()}>
          {isSettings ? "Save" : "Continue to Stripe"}
        </button>
      </div>
    </div>
  );
};
