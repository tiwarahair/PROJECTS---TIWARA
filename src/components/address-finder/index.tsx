import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { CircleAlert, MapPin, Search, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { AddressRowSkeleton } from "../skeleton/address-row-skeleton";
import styles from "../../styles/components/address-finder/index.module.css";
import { MapsProvider } from "../../lib/google-maps";
import { useAddressFinder } from "./use-address-finder";
import type {
  AddressFinderValue,
  AddressFixture,
  EmittedAddress,
} from "./data";

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
    isSearching,
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
            <Search className={styles.searchIcon} size={18} strokeWidth={1.7} />
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
                  <X size={12} strokeWidth={2.4} />
                </span>
              </button>
            )}
            {isSearching && (
              <div className={styles.popover} aria-busy="true">
                {[1, 2, 3].map((row) => (
                  <AddressRowSkeleton key={row} />
                ))}
              </div>
            )}
            {isOpen && !isSearching && (
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
                        <MapPin
                          className={styles.pinIcon}
                          size={16}
                          strokeWidth={1.7}
                        />
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
          <div
            id={ids.queryError}
            aria-live="polite"
            className={styles.errorSlot}
          >
            {queryError && (
              <div role="alert" className={styles.error}>
                <CircleAlert
                  className={styles.errorIcon}
                  size={15}
                  strokeWidth={1.5}
                />
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
            <MapPin className={styles.summaryPin} size={18} strokeWidth={1.7} />
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
                        <CircleAlert
                          className={styles.errorIcon}
                          size={15}
                          strokeWidth={1.5}
                        />
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
              <Search size={15} strokeWidth={1.8} />
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
