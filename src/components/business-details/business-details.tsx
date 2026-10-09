import { useEffect, useId, useRef, useState } from "react";
import { formatPostcodeInput } from "../../utils/address";
import { joinClassNames } from "../../utils/class-names";
import type { TaxDetails } from "../tax-details-form/tax-details-logic";
import {
  formatVatNumber,
  getAreaLabel,
  getBusinessErrors,
  getBusinessKey,
  getInitialBusinessState,
  getLegalRows,
} from "./business-details-logic";
import type {
  BusinessFields,
  BusinessPreset,
  BusinessRuleKey,
  BusinessState,
  BusinessValue,
} from "./business-details-logic";
import {
  ErrorIcon,
  FieldError,
  LocationCard,
  Reveal,
  Section,
  TickIcon,
  TypeTiles,
} from "./business-details-sections";
import type { FieldView } from "./business-details-sections";
import styles from "./business-details.module.css";

const TOAST_MS = 2400;

/** What the host (Studio) gets after every render to drive its own save bar. */
export interface BusinessDetailsApi {
  canSave: boolean;
  save: () => void;
}

export interface BusinessDetailsProps {
  preset?: BusinessPreset;
  /** Accepted for the host; the prototype doesn't render it. */
  stripe?: "connected" | "company" | "none" | "action";
  scrollTo?: "" | "type" | "location" | "vat" | "legal";
  embedded?: boolean;
  hideSave?: boolean;
  value?: Partial<Omit<BusinessValue, "v">> & { v?: Partial<BusinessFields> };
  /** Legal details from TaxDetailsForm; null shows the "add tax details" state. */
  tax?: Partial<TaxDetails> | null;
  onSave?: (value: BusinessValue) => void;
  onState?: (api: BusinessDetailsApi) => void;
  onEditTax?: () => void;
  onConnectStripe?: () => void;
}

/**
 * Studio → Settings → Business details (prototype BusinessDetails.dc.html): business type, location (address,
 * home-area preview or mobile base + radius), contact, VAT, legal details and a save bar.
 */
export const BusinessDetails = ({
  preset = "shop",
  scrollTo = "",
  embedded = false,
  hideSave = false,
  value,
  tax,
  onSave,
  onState,
  onEditTax,
}: BusinessDetailsProps) => {
  const uid = "bd" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setRawState] = useState(() =>
    getInitialBusinessState(preset, value),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  const setState = (
    patch: (current: BusinessState) => Partial<BusinessState>,
  ) => setRawState((current) => ({ ...current, ...patch(current) }));
  const setFields = (fields: Partial<BusinessFields>) =>
    setState(({ v }) => ({ v: { ...v, ...fields } }));
  const touch = (key: BusinessRuleKey) =>
    setState(({ touched }) => ({ touched: { ...touched, [key]: true } }));

  const { type, vatOn, v, touched } = state;
  const rules = getBusinessErrors(state);
  const getError = (key: BusinessRuleKey) => (touched[key] ? rules[key] : "");
  const shown = (Object.keys(rules) as BusinessRuleKey[]).filter(getError);
  const isDirty = getBusinessKey(state) !== state.saved;
  const vatDigits = v.vat.replace(/\s+/g, "");
  const vatError = getError("vat");
  const legalRows = getLegalRows(tax);
  const hasLegal = tax !== null;

  const save = () => {
    const failing = (Object.keys(rules) as BusinessRuleKey[]).filter(
      (key) => rules[key],
    );
    if (failing.length) {
      setState(({ touched: current }) => ({
        touched: {
          ...current,
          ...Object.fromEntries(failing.map((key) => [key, true])),
        },
      }));
      return;
    }
    window.clearTimeout(toastTimer.current);
    onSave?.({
      type,
      vatOn,
      v: {
        ...v,
        pc: formatPostcodeInput(v.pc),
        basePc: formatPostcodeInput(v.basePc),
      },
    });
    // inside Studio the host shows its own toast
    const isOwnToast = !embedded;
    setState(() => ({ saved: getBusinessKey(state), toast: isOwnToast }));
    if (isOwnToast)
      toastTimer.current = window.setTimeout(
        () => setState(() => ({ toast: false })),
        TOAST_MS,
      );
  };

  // report after every render, like the prototype's componentDidMount / componentDidUpdate
  useEffect(() => {
    onState?.({ canSave: isDirty, save });
  });

  useEffect(() => {
    const element = scrollRef.current;
    const target = scrollTo
      ? element?.querySelector<HTMLElement>('[data-sec="' + scrollTo + '"]')
      : null;
    if (element && target)
      element.scrollTop = Math.max(0, target.offsetTop - 12);
    return () => window.clearTimeout(toastTimer.current);
    // mount only (prototype componentDidMount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getField = (
    key: "basePc" | "phone" | "email",
    label: string,
    isPostcode = false,
  ): FieldView => ({
    id: uid + "-" + key,
    errId: uid + "-" + key + "-e",
    label,
    value: v[key],
    error: getError(key),
    onChange: (event) => setFields({ [key]: event.target.value }),
    onBlur: () => {
      if (isPostcode) setFields({ [key]: formatPostcodeInput(v[key]) });
      touch(key);
    },
  });
  const contactFields = [
    {
      field: getField("phone", "Business phone"),
      type: "tel",
      isPhone: true,
    },
    {
      field: getField("email", "Business email"),
      type: "email",
      isPhone: false,
    },
  ];

  return (
    <div
      className={styles.root}
      data-bd-emb={embedded ? "1" : "0"}
      data-bd-hidesave={hideSave ? "1" : "0"}
      data-screen-label="Business details"
    >
      <div className={styles.scroll} ref={scrollRef} data-bd-scroll="1">
        <div className={styles.pad} data-bd-pad="1">
          {!embedded && (
            <>
              <button
                className={joinClassNames(styles.back, styles.focusRing)}
                data-bd-in="1"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
                Settings
              </button>
              <h1 className={styles.title}>Business details</h1>
            </>
          )}

          <div
            className={joinClassNames(
              styles.body,
              embedded ? styles.bodyEmbedded : styles.bodyStandalone,
            )}
          >
            <Section
              id="type"
              label="Business type"
              heading="Business type"
              intro="Where you see clients."
            >
              <TypeTiles
                type={type}
                onPick={(picked) => setState(() => ({ type: picked }))}
              />
            </Section>

            <Section
              id="location"
              label="Location"
              heading={
                type === "mobile"
                  ? "Where you work"
                  : type === "home"
                    ? "Your address"
                    : "Salon address"
              }
            >
              <LocationCard
                type={type}
                finderId={uid + "-addr"}
                addressValue={
                  v.line1
                    ? {
                        line1: v.line1,
                        line2: v.line2,
                        town: v.city,
                        postcode: v.pc,
                        source: state.addrSrc || "pick",
                      }
                    : null
                }
                onAddress={(address) =>
                  setState(({ v: current }) => ({
                    addrSrc: address ? address.source : "",
                    v: {
                      ...current,
                      ...(address
                        ? {
                            line1: address.line1,
                            line2: address.line2 || "",
                            city: address.town,
                            pc: address.postcode,
                          }
                        : { line1: "", line2: "", city: "", pc: "" }),
                    },
                  }))
                }
                showAddressErrors={!!touched.addr}
                areaLabel={getAreaLabel(v.pc)}
                basePostcode={getField("basePc", "Base postcode", true)}
                radiusId={uid + "-rad"}
                radius={v.radius}
                onRadius={(radius) => setFields({ radius })}
              />
            </Section>

            <Section
              id="contact"
              label="Contact details"
              heading="Contact details"
              intro={
                type === "home" || type === "mobile"
                  ? "Shown to clients once their booking is confirmed, clients can use these to contact you about a booking."
                  : "Shown on your profile."
              }
            >
              <div className={styles.contactCard}>
                {contactFields.map(({ field, type: inputType, isPhone }) => (
                  <div key={field.id}>
                    <label className={styles.label} htmlFor={field.id}>
                      {field.label}
                    </label>
                    <input
                      className={joinClassNames(
                        styles.input,
                        styles.focusRing,
                        isPhone ? styles.widthPhone : styles.widthFull,
                        field.error ? styles.fieldErr : styles.fieldOk,
                      )}
                      data-bd-in="1"
                      id={field.id}
                      type={inputType}
                      autoComplete={inputType}
                      inputMode={inputType === "tel" ? "tel" : "email"}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={field.error ? "true" : "false"}
                      aria-describedby={field.errId}
                    />
                    <FieldError id={field.errId} error={field.error} />
                  </div>
                ))}
              </div>
            </Section>

            <Section id="vat" label="VAT" heading="VAT">
              <div className={styles.card}>
                <button
                  className={joinClassNames(styles.vatToggle, styles.focusRing)}
                  data-bd-in="1"
                  role="checkbox"
                  aria-checked={vatOn ? "true" : "false"}
                  onClick={() => setState(() => ({ vatOn: !vatOn }))}
                >
                  <span
                    className={joinClassNames(
                      styles.vatBox,
                      vatOn ? styles.vatBoxOn : styles.vatBoxOff,
                    )}
                  >
                    <TickIcon
                      className={joinClassNames(
                        styles.vatTick,
                        vatOn ? styles.vatTickOn : styles.vatTickOff,
                      )}
                      size={14}
                      strokeWidth="3"
                      stroke="#fffefb"
                    />
                  </span>
                  <span className={styles.areaText}>I’m VAT registered</span>
                </button>
                <Reveal open={!vatOn}>
                  <div className={styles.vatNote}>
                    Most independent stylists aren’t VAT registered. You only
                    need this if you’ve registered with HMRC.
                  </div>
                </Reveal>
                <Reveal open={vatOn}>
                  <div className={styles.vatField}>
                    <label className={styles.label} htmlFor={uid + "-vat"}>
                      VAT number
                    </label>
                    <span className={styles.vatWrap}>
                      <span className={styles.vatPrefix} aria-hidden="true">
                        GB
                      </span>
                      <input
                        className={joinClassNames(
                          styles.vatInput,
                          styles.focusRing,
                          vatError ? styles.fieldErr : styles.fieldOk,
                        )}
                        data-bd-in="1"
                        id={uid + "-vat"}
                        inputMode="numeric"
                        autoComplete="off"
                        value={v.vat}
                        onChange={(event) =>
                          setFields({
                            vat: event.target.value
                              .toUpperCase()
                              .replace(/^\s*GB\s*/, "")
                              .replace(/[^\d ]/g, "")
                              .slice(0, 16),
                          })
                        }
                        onBlur={() => touch("vat")}
                        aria-invalid={vatError ? "true" : "false"}
                        aria-describedby={uid + "-vath"}
                      />
                    </span>
                    {!!vatError && (
                      <div className={styles.error} role="alert">
                        <ErrorIcon className={styles.errorIcon} />
                        {vatError}
                      </div>
                    )}
                    {vatOn && !rules.vat && vatDigits.length > 0 && (
                      <div className={styles.vatOk}>
                        <TickIcon size={15} strokeWidth="2" />
                        {formatVatNumber(vatDigits)}
                      </div>
                    )}
                    <div className={styles.vatHelp} id={uid + "-vath"}>
                      Shown on your clients’ receipts and your payout
                      statements.
                    </div>
                  </div>
                </Reveal>
              </div>
            </Section>

            <Section
              id="legal"
              label="Legal details"
              heading="Legal details"
              intro="From your tax details. Used for payouts."
            >
              <div className={styles.legalCard}>
                {hasLegal && (
                  <dl className={styles.legalList}>
                    {legalRows.map(({ label, value: rowValue }, index) => (
                      <div
                        key={"l" + index}
                        className={joinClassNames(
                          styles.legalRow,
                          index ? styles.legalRowNext : styles.legalRowFirst,
                        )}
                      >
                        <dt className={styles.legalKey}>{label}</dt>
                        <dd className={styles.legalValue}>{rowValue}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {!hasLegal && (
                  <p className={styles.legalNone}>
                    Add your tax details to get paid. Your legal details will
                    appear here.
                  </p>
                )}
                <button
                  className={joinClassNames(styles.legalLink, styles.focusRing)}
                  data-bd-in="1"
                  onClick={() => onEditTax?.()}
                >
                  {hasLegal ? "Edit in Tax details" : "Add tax details"}
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </button>
              </div>
            </Section>
          </div>
        </div>
      </div>

      <div
        className={styles.saveBar}
        data-bd-bar="1"
        data-screen-label="Save bar"
      >
        <div
          className={joinClassNames(
            styles.toast,
            state.toast ? styles.toastShown : styles.toastHidden,
          )}
          data-bd-toast="1"
          role="status"
          aria-live="polite"
        >
          <TickIcon size={16} strokeWidth="2" />
          Business details saved
        </div>
        <div className={styles.barInner} data-bd-barin="1">
          {shown.length > 0 && (
            <div className={styles.barError}>
              <ErrorIcon className={styles.barErrorIcon} />
              {shown.length === 1
                ? "Fix the highlighted field to save"
                : "Fix the " + shown.length + " highlighted fields to save"}
            </div>
          )}
          <button
            className={joinClassNames(
              styles.saveButton,
              styles.focusRing,
              isDirty ? styles.saveDirty : styles.saveClean,
            )}
            data-bd-in="1"
            data-bd-savebtn="1"
            disabled={!isDirty}
            onClick={save}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};
