import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import { AddressFinder } from "../address-finder/address-finder";
import {
  getAddressKey,
  getBlankAddress,
  getInitialTaxState,
  getTaxBusiness,
  getTaxErrors,
  getTaxOutput,
  getTouchedAll,
  formatNationalInsuranceNumber,
} from "./tax-details-logic";
import type {
  TaxAddressState,
  TaxBusiness,
  TaxDetails,
  TaxErrorKey,
  TaxFixture,
  TaxKind,
  TaxState,
} from "./tax-details-logic";
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
}

const KINDS: [TaxKind, string][] = [
  ["sole", "Sole trader / self-employed"],
  ["ltd", "Limited company"],
];

const DOB_PARTS = [
  { key: "day", label: "DD", aria: "Day", max: 2, autoComplete: "bday-day" },
  {
    key: "month",
    label: "MM",
    aria: "Month",
    max: 2,
    autoComplete: "bday-month",
  },
  {
    key: "year",
    label: "YYYY",
    aria: "Year",
    max: 4,
    autoComplete: "bday-year",
  },
] as const;

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  autoComplete?: string;
  optional?: boolean;
  help?: string;
  placeholder?: string;
  isCode?: boolean;
}

/** One labelled text field with its error. */
const Field = ({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  autoComplete = "off",
  optional = false,
  help,
  placeholder,
  isCode = false,
}: FieldProps) => {
  const errorId = `${id}-e`;

  return (
    <div>
      <label
        className={help === undefined ? styles.label : styles.labelTight}
        htmlFor={id}
      >
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {help !== undefined && <div className={styles.help}>{help}</div>}
      <input
        className={joinClassNames(
          styles.input,
          error ? styles.fieldErr : styles.fieldOk,
          help !== undefined && (isCode ? styles.textCode : styles.textPlain),
        )}
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
      />
      {!!error && (
        <div className={styles.error} role="alert" id={errorId}>
          {error}
        </div>
      )}
    </div>
  );
};

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
}: TaxDetailsFormProps) => {
  const uid = `tx${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const [state, setRawState] = useState(() =>
    getInitialTaxState({ fixture, businessName, business, value }),
  );

  const dobRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setState = (patch: Partial<TaxState>) =>
    setRawState((current) => ({ ...current, ...patch }));

  const touch = (key: TaxErrorKey | "middle") =>
    setRawState((current) => ({
      ...current,
      touched: { ...current.touched, [key]: 1 },
    }));

  const isSole = state.kind === "sole";
  const addressKey = getAddressKey(state.kind);
  const address = state[addressKey];

  const setAddress = (patch: Partial<TaxAddressState>) =>
    setRawState((current) => ({
      ...current,
      [addressKey]: { ...current[addressKey], ...patch },
    }));

  const errors = getTaxErrors(state);

  const getError = (key: TaxErrorKey) =>
    (state.touched[key] && errors[key]) || "";

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

  const dobError = getError("dob");
  const nationalInsuranceError = getError("nationalInsuranceNumber");
  const isSettings = mode === "settings";

  const submit = () => {
    if (Object.keys(errors).length) {
      setState({ touched: getTouchedAll() });

      return;
    }

    onSubmit?.(getTaxOutput(state, legalName, business));
  };

  return (
    <div className={styles.form} data-screen-label="Tax details form">
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>How is your business set up?</legend>
        <div className={styles.kinds} role="radiogroup">
          {KINDS.map(([kind, label]) => {
            const isOn = state.kind === kind;

            return (
              <button
                key={kind}
                className={joinClassNames(
                  styles.tile,
                  isOn ? styles.tileOn : styles.tileOff,
                )}
                role="radio"
                aria-checked={isOn ? "true" : "false"}
                onClick={() => setState({ kind, touched: {} })}
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
                const isOn = state.nameYes === isYes;

                return (
                  <button
                    key={key}
                    className={joinClassNames(
                      styles.chip,
                      isOn ? styles.chipOn : styles.chipOff,
                    )}
                    role="radio"
                    aria-checked={isOn ? "true" : "false"}
                    onClick={() => setState({ nameYes: isYes })}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {!state.nameYes && (
              <div className={styles.nameFields} data-tx-anim="1">
                <div className={styles.hint}>
                  As it appears on your passport or driving licence.
                </div>
                <Field
                  id={fieldId("first")}
                  label="Legal first name"
                  value={state.first}
                  error={getError("first")}
                  onChange={(event) => setState({ first: event.target.value })}
                  onBlur={() => touch("first")}
                  autoComplete="given-name"
                />
                <Field
                  id={fieldId("middle")}
                  label="Middle name(s)"
                  value={state.middle}
                  error=""
                  onChange={(event) => setState({ middle: event.target.value })}
                  onBlur={() => touch("middle")}
                  autoComplete="additional-name"
                  optional={true}
                />
                <Field
                  id={fieldId("last")}
                  label="Legal last name"
                  value={state.last}
                  error={getError("last")}
                  onChange={(event) => setState({ last: event.target.value })}
                  onBlur={() => touch("last")}
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
                ({ key, label, aria, max, autoComplete }, index) => (
                  <label
                    key={key}
                    className={joinClassNames(
                      styles.dobPart,
                      max === 4 ? styles.dobLong : styles.dobShort,
                    )}
                  >
                    <span className={styles.dobLabel}>{label}</span>
                    <input
                      className={joinClassNames(
                        styles.dobInput,
                        dobError ? styles.fieldErr : styles.fieldOk,
                      )}
                      ref={(element) => {
                        dobRefs.current[index] = element;
                      }}
                      value={state[key]}
                      onChange={(event) => {
                        const digits = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, max);

                        setState({ [key]: digits });

                        if (digits.length === max && index < 2)
                          dobRefs.current[index + 1]?.focus();
                      }}
                      onBlur={() => touch("dob")}
                      inputMode="numeric"
                      autoComplete={autoComplete}
                      maxLength={max}
                      placeholder={label}
                      aria-label={aria}
                      aria-invalid={dobError ? "true" : "false"}
                    />
                  </label>
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
            value={state.companyName}
            error={getError("companyName")}
            onChange={(event) => setState({ companyName: event.target.value })}
            onBlur={() => touch("companyName")}
            help="As registered at Companies House."
            placeholder=""
          />
          <Field
            id={fieldId("coNum")}
            label="Company registration number"
            value={state.companyNumber}
            error={getError("companyNumber")}
            onChange={(event) =>
              setState({
                companyNumber: event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 8),
              })
            }
            onBlur={() => touch("companyNumber")}
            help="8 characters, like 12345678 or SC123456."
            placeholder="12345678"
            isCode={true}
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
                checked={address.same}
                onChange={(event) => setAddress({ same: event.target.checked })}
              />
              <span>Same as my business address</span>
            </label>
            {address.same && <div className={styles.sameText}>{sameText}</div>}
          </>
        )}
        {!address.same && (
          <div className={styles.finder}>
            {/* host block for the embedded address finder */}
            <div data-dc-host="">
              <AddressFinder
                idPrefix={`${uid}-${addressKey}`}
                label="Address or postcode"
                value={
                  address.fields.line1
                    ? {
                        line1: address.fields.line1,
                        line2: address.fields.line2,
                        town: address.fields.city,
                        postcode: address.fields.postcode,
                        source: address.src || "pick",
                      }
                    : null
                }
                onChange={(picked) =>
                  setAddress({
                    src: picked ? picked.source : "",
                    fields: picked
                      ? {
                          line1: picked.line1,
                          line2: picked.line2 || "",
                          city: picked.town,
                          postcode: picked.postcode,
                        }
                      : getBlankAddress(),
                  })
                }
                showErrors={!!state.touched.address}
                fieldHeight={50}
                labelSize={13.5}
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
            Used for tax reporting. It looks like QQ 12 34 56 C.
          </div>
          <div className={styles.niWrap}>
            <input
              className={joinClassNames(
                styles.niInput,
                nationalInsuranceError ? styles.fieldErr : styles.fieldOk,
              )}
              id={fieldId("ni")}
              type={state.showNationalInsurance ? "text" : "password"}
              value={state.nationalInsuranceNumber}
              onChange={(event) =>
                setState({
                  nationalInsuranceNumber: formatNationalInsuranceNumber(
                    event.target.value,
                  ),
                })
              }
              onBlur={() => touch("nationalInsuranceNumber")}
              autoComplete="off"
              spellCheck="false"
              placeholder="QQ 12 34 56 C"
              aria-invalid={nationalInsuranceError ? "true" : "false"}
              aria-describedby={fieldId("ni-e")}
            />
            <button
              className={styles.niToggle}
              onClick={() =>
                setState({
                  showNationalInsurance: !state.showNationalInsurance,
                })
              }
              aria-label={
                state.showNationalInsurance
                  ? "Hide National Insurance number"
                  : "Show National Insurance number"
              }
              aria-pressed={state.showNationalInsurance}
            >
              {!state.showNationalInsurance && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
              {state.showNationalInsurance && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.7 5.1A10.7 10.7 0 0 1 21.9 11.7a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.4 2.6M14.1 14.2a3 3 0 0 1-4.2-4.2M17.5 17.5A10.8 10.8 0 0 1 2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.4-5.1M2 2l20 20"></path>
                </svg>
              )}
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
        <svg
          className={styles.noteIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        <span>Stored securely and only shared with HMRC.</span>
      </div>

      <div className={styles.actions}>
        {isSettings && (
          <button className={styles.cancel} onClick={() => onCancel?.()}>
            Cancel
          </button>
        )}
        <button className={styles.submit} onClick={submit}>
          {isSettings ? "Save" : "Continue to Stripe"}
        </button>
      </div>
    </div>
  );
};
