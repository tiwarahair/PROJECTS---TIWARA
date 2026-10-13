import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/address-finder/address-finder.module.css";
import { MapsProvider } from "../../lib/google-maps";
import { useAddressFinder } from "./use-address-finder";
import type {
  AddressFinderValue,
  AddressFixture,
  EmittedAddress,
} from "./use-address-finder";

export interface AddressFinderProps {
  label?: string;
  value?: AddressFinderValue | null;
  onChange?: (address: EmittedAddress | null) => void;
  fixture?: AddressFixture;
  showErrors?: boolean;
  fieldHeight?: number;
  labelSize?: number;
  labelColor?: "primary" | "secondary";
  idPrefix?: string;
  autoFocus?: boolean;
}

const MANUAL_FIELDS = [
  {
    key: "line1",
    label: "Address line 1",
    autoComplete: "address-line1",
    optional: false,
    sizeClass: "",
  },
  {
    key: "line2",
    label: "Address line 2",
    autoComplete: "address-line2",
    optional: true,
    sizeClass: "",
  },
  {
    key: "town",
    label: "Town/city",
    autoComplete: "address-level2",
    optional: false,
    sizeClass: styles.fieldTown,
  },
  {
    key: "postcode",
    label: "Postcode",
    autoComplete: "postal-code",
    optional: false,
    sizeClass: styles.fieldPostcode,
  },
] as const;

/** Keeps focus in the input while a suggestion or link is pressed. */
const keepFocus = (event: MouseEvent) => event.preventDefault();

const ErrorIcon = () => (
  <svg
    className={styles.errorIcon}
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 7v6M12 16.5v.5"></path>
  </svg>
);

const PinIcon = ({ className, size }: { className?: string; size: number }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"></path>
    <circle cx="12" cy="9" r="2.5"></circle>
  </svg>
);

const SearchIcon = ({
  className,
  size,
  strokeWidth,
}: {
  className?: string;
  size: number;
  strokeWidth: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>
);

/**
 * The ONE address field (Booking, Onboarding, BusinessDetails, TaxDetailsForm): finder with suggestions →
 * summary card + Edit → manual fields.
 */
const AddressFinderField = ({
  label = "Address or postcode",
  value,
  onChange,
  fixture = "",
  showErrors = false,
  fieldHeight = 50,
  labelSize = 14.5,
  labelColor = "primary",
  idPrefix,
  autoFocus = false,
}: AddressFinderProps) => {
  const [generatedId] = useState(
    () => `af${Math.random().toString(36).slice(2, 7)}`,
  );

  const prefix = idPrefix || generatedId;

  const ids = {
    query: `${prefix}-q`,
    list: `${prefix}-list`,
    queryError: `${prefix}-q-err`,
  };

  const finder = useAddressFinder({
    value,
    onChange,
    fixture,
    showErrors,
    autoFocus,
  });

  const {
    state,
    hits,
    isOpen,
    queryError,
    fieldErrors,
    isErrorShown,
    summaryLines,
  } = finder;

  // label size/colour and field height are props
  const rootStyle = {
    "--af-field-height": `${fieldHeight}px`,
    "--af-label-size": `${labelSize}px`,
    "--af-label-colour":
      labelColor === "secondary"
        ? "var(--text-secondary)"
        : "var(--text-primary)",
  } as CSSProperties;

  return (
    <div
      data-af-root={prefix}
      data-screen-label="Address finder"
      className={styles.root}
      style={rootStyle}
    >
      {state.mode === "find" && (
        <div className={styles.findStack}>
          <label htmlFor={ids.query} className={styles.label}>
            {label}
          </label>
          <div className={styles.inputWrap}>
            <SearchIcon
              className={styles.searchIcon}
              size={18}
              strokeWidth="1.7"
            />
            <input
              ref={finder.queryRef}
              id={ids.query}
              type="text"
              className={joinClassNames(styles.input, styles.queryInput)}
              value={state.query}
              onChange={finder.handleQueryChange}
              onKeyDown={finder.handleQueryKeyDown}
              onFocus={finder.handleQueryFocus}
              onBlur={finder.handleQueryBlur}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Start typing your address or postcode"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen ? "true" : "false"}
              aria-controls={ids.list}
              aria-activedescendant={
                isOpen && state.highlightedIndex >= 0
                  ? `${prefix}-opt-${state.highlightedIndex}`
                  : ""
              }
              aria-invalid={queryError ? "true" : "false"}
              aria-describedby={ids.queryError}
            />
            {state.query.length > 0 && (
              <button
                type="button"
                className={styles.clear}
                onMouseDown={keepFocus}
                onClick={finder.clearQuery}
                aria-label="Clear address search"
              >
                <span className={styles.clearDot}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12"></path>
                  </svg>
                </span>
              </button>
            )}
            {isOpen && (
              <div className={styles.popover}>
                {hits.length > 0 && (
                  <div
                    id={ids.list}
                    role="listbox"
                    aria-label="Matching addresses"
                    className={styles.list}
                  >
                    {hits.map((hit, index) => (
                      <div
                        key={hit.id}
                        id={`${prefix}-opt-${index}`}
                        role="option"
                        tabIndex={-1}
                        aria-selected={
                          index === state.highlightedIndex ? "true" : "false"
                        }
                        className={joinClassNames(
                          styles.option,
                          index === state.highlightedIndex &&
                            styles.optionActive,
                        )}
                        onMouseDown={keepFocus}
                        onClick={() => finder.pick(hit)}
                        onMouseEnter={() => finder.setActiveIndex(index)}
                      >
                        <PinIcon className={styles.pinIcon} size={16} />
                        <span className={styles.optionText}>
                          <span className={styles.optionLine}>
                            {hit.line.map(({ key, text, highlighted }) => (
                              <span
                                key={key}
                                className={joinClassNames(
                                  styles.lineSegment,
                                  highlighted && styles.lineSegmentHit,
                                )}
                              >
                                {text}
                              </span>
                            ))}
                          </span>
                          <span className={styles.optionSub}>
                            {hit.secondaryLine.map(
                              ({ key, text, highlighted }) => (
                                <span
                                  key={key}
                                  className={joinClassNames(
                                    styles.subSegment,
                                    highlighted && styles.subSegmentHit,
                                  )}
                                >
                                  {text}
                                </span>
                              ),
                            )}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {hits.length === 0 && (
                  <div role="status" className={styles.noMatch}>
                    <span>We can’t find that address</span>
                    <button
                      type="button"
                      className={styles.inlineLink}
                      onMouseDown={keepFocus}
                      onClick={() => finder.toManual()}
                    >
                      Enter it manually
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div id={ids.queryError} aria-live="polite">
            {queryError && (
              <div role="alert" className={styles.error}>
                <ErrorIcon />
                {queryError}
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              className={styles.textLink}
              onClick={() => finder.toManual()}
            >
              Enter address manually
            </button>
          </div>
        </div>
      )}

      {state.mode === "summary" && (
        <div className={styles.summaryStack}>
          <div className={styles.summaryCard}>
            <PinIcon className={styles.summaryPin} size={18} />
            <address className={styles.address}>
              {summaryLines.map((line, index) => (
                <div
                  key={`l${index}`}
                  className={
                    index === 0 ? styles.addressFirst : styles.addressRest
                  }
                >
                  {line}
                </div>
              ))}
            </address>
            <button
              type="button"
              ref={finder.editRef}
              className={styles.edit}
              onClick={() => finder.toManual()}
              aria-label="Edit address"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {state.mode === "manual" && (
        <div className={styles.manualStack}>
          {MANUAL_FIELDS.map(
            ({ key, label: fieldLabel, autoComplete, optional, sizeClass }) => {
              const error = isErrorShown(key) ? fieldErrors[key] : "";
              const fieldId = `${prefix}-${key}`;

              return (
                <div
                  key={key}
                  className={joinClassNames(styles.fieldGroup, sizeClass)}
                >
                  <label htmlFor={fieldId} className={styles.label}>
                    {fieldLabel}
                    {optional && (
                      <span className={styles.optional}> Optional</span>
                    )}
                  </label>
                  <input
                    ref={finder.fieldRefs[key]}
                    id={fieldId}
                    type="text"
                    className={joinClassNames(
                      styles.input,
                      key === "postcode" && styles.uppercase,
                    )}
                    value={state.draft[key]}
                    onChange={finder.handleFieldChange(key)}
                    onBlur={finder.handleFieldBlur(key)}
                    autoComplete={autoComplete}
                    autoCapitalize={key === "postcode" ? "characters" : "words"}
                    aria-invalid={error ? "true" : "false"}
                    aria-describedby={`${fieldId}-err`}
                  />
                  <div id={`${fieldId}-err`} aria-live="polite">
                    {error && (
                      <div role="alert" className={styles.error}>
                        <ErrorIcon />
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              );
            },
          )}
          <div className={styles.toFindRow}>
            <button
              type="button"
              className={joinClassNames(styles.textLink, styles.toFind)}
              onClick={finder.toFind}
            >
              <SearchIcon size={15} strokeWidth="1.8" />
              Search for your address instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Loads Google Maps only where an address field is on screen. */
export const AddressFinder = (props: AddressFinderProps) => (
  <MapsProvider>
    <AddressFinderField {...props} />
  </MapsProvider>
);
