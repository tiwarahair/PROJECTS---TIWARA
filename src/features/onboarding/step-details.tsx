import { Shield } from "lucide-react";
import { AddressFinder } from "../../components/address-finder";
import { joinClassNames } from "../../utils/class-names";
import { RADII } from "./data";
import { OnboardingMap } from "./map";
import type { ScreenProps } from "./screen-props";
import fieldStyles from "../../styles/features/onboarding/wizard-field.module.css";
import styles from "../../styles/features/onboarding/step-details.module.css";

/** Step 3: business name, then the address + pin (or base postcode + travel radius for mobile stylists). */
export const StepDetails = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions, defaultLatLng } = onboarding;
  const { form } = state;
  const { shown } = view;
  const isMobile = form.type === "mobile";
  const radiusBase = form.postcode ? form.postcode.toUpperCase() : "your base";

  const areaHint =
    state.area || (form.postcode || "").toUpperCase().split(/\s/)[0] || "";

  return (
    <>
      <label htmlFor="ob-biz" className={fieldStyles.label}>
        Business name
      </label>
      <input
        id="ob-biz"
        autoComplete="organization"
        {...actions.field("businessName")}
        aria-invalid={shown.businessName ? "true" : "false"}
        aria-describedby="ob-biz-help"
        className={joinClassNames(
          fieldStyles.input,
          shown.businessName ? fieldStyles.borderError : fieldStyles.border,
        )}
      />
      <div
        id="ob-biz-help"
        role="alert"
        className={joinClassNames(
          styles.help,
          shown.businessName ? fieldStyles.helpError : fieldStyles.helpMuted,
        )}
      >
        {shown.businessName ||
          "The name clients see. Your legal name comes from Stripe later."}
      </div>
      {isMobile && (
        <>
          <label htmlFor="ob-bpc" className={styles.postcodeLabel}>
            Base postcode
          </label>
          <input
            id="ob-bpc"
            autoComplete="postal-code"
            autoCapitalize="characters"
            {...actions.field("postcode")}
            aria-invalid={shown.postcode ? "true" : "false"}
            className={joinClassNames(
              styles.postcodeInput,
              shown.postcode ? fieldStyles.borderError : fieldStyles.border,
            )}
          />
          <div
            role="alert"
            className={joinClassNames(
              styles.help,
              shown.postcode ? fieldStyles.helpError : fieldStyles.helpMuted,
            )}
          >
            {shown.postcode ||
              "Where your day usually starts. Clients never see it."}
          </div>
          <div className={styles.radiusTitle}>How far will you travel?</div>
          <div
            role="radiogroup"
            aria-label="Travel distance"
            className={styles.radii}
          >
            {RADII.map((radius) => {
              const on = form.radius === radius;

              return (
                <button
                  key={radius}
                  role="radio"
                  aria-checked={on ? "true" : "false"}
                  onClick={() => actions.setField("radius", radius)}
                  className={joinClassNames(
                    styles.radius,
                    on ? styles.radiusOn : styles.radiusOff,
                  )}
                >
                  {`${radius} miles`}
                </button>
              );
            })}
          </div>
          <div className={styles.radiusHint}>
            {`Clients within ${form.radius} miles of ${radiusBase} can book you. You can change this any time.`}
          </div>
        </>
      )}
      {!isMobile && (
        <>
          <div className={styles.finderWrap}>
            <AddressFinder
              idPrefix="ob-addr"
              label="Address or postcode"
              value={
                form.line1
                  ? {
                      line1: form.line1,
                      line2: form.line2,
                      town: form.city,
                      postcode: form.postcode,
                      source: state.addressSource || "pick",
                    }
                  : null
              }
              onChange={actions.setAddress}
              showErrors={!!shown.address}
              fieldHeight={54}
              labelSize={14}
            />
          </div>
          {state.addressOpen && (
            <div className={styles.pinSection}>
              <div className={styles.pinTitle}>
                Is the pin in the right place?
              </div>
              <div className={styles.pinSub}>
                Drag it, or tap the map, to mark your door.
              </div>
              <OnboardingMap
                center={
                  state.pinLatLng || state.geocodedLatLng || defaultLatLng
                }
                geocodedLatLng={state.geocodedLatLng}
                isDark={layout.isDark}
                onPin={(pinLatLng) =>
                  actions.setState({ pinLatLng }, actions.save)
                }
              />
              {form.type === "home" && (
                <div className={styles.homeNote}>
                  <Shield
                    size={18}
                    strokeWidth={1.7}
                    className={styles.homeNoteIcon}
                  />
                  <span>
                    Clients only see your area ({areaHint}) until their booking
                    is confirmed.
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};
