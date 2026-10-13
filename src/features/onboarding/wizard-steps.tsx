import type { ChangeEvent, ReactNode } from "react";
import { AddressFinder } from "../../components/address-finder/address-finder";
import type { AddressFixture } from "../../components/address-finder/use-address-finder";
import { PasswordMeter } from "../../components/password-meter/password-meter";
import { joinClassNames } from "../../utils/class-names";
import { getOnboardingMeter } from "./auth-screens-account";
import { BUSINESS_TYPES, CATEGORIES, RADII, SOURCES } from "./onboarding-data";
import { OnboardingTurnstile } from "./onboarding-turnstile";
import { OnboardingMap } from "./onboarding-map";
import type { ScreenProps } from "./screen-props";
import styles from "../../styles/features/onboarding/wizard-steps.module.css";

interface WizardFieldProps {
  id: string;
  label: string;
  spacing?: "first" | "next";
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error: string;
  type?: string;
  inputMode?: "email";
  autoComplete: string;
}

const WizardField = ({
  id,
  label,
  spacing = "first",
  value,
  onChange,
  onBlur,
  error,
  type,
  inputMode,
  autoComplete,
}: WizardFieldProps) => (
  <>
    <label
      htmlFor={id}
      className={spacing === "next" ? styles.labelNext : styles.label}
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      aria-invalid={error ? "true" : "false"}
      className={joinClassNames(
        styles.input,
        error ? styles.borderError : styles.border,
      )}
    />
    <div role="alert" className={styles.error}>
      {error}
    </div>
  </>
);

/** Selection tile colours. */
const tileClass = (on: boolean) => (on ? styles.tileOn : styles.tileOff);

/** Step 1: how you work; picking one moves on after 300ms. */
export const StepType = ({ onboarding, layout }: ScreenProps) => {
  const { state, actions } = onboarding;

  return (
    <div
      role="radiogroup"
      aria-label="How you work"
      className={joinClassNames(
        styles.typeGrid,
        layout.isTabletOrWider ? styles.typeGridMid : styles.typeGridNarrow,
      )}
    >
      {BUSINESS_TYPES.map(({ key, title, subtitle, iconPath }) => {
        const on = state.form.type === key;

        return (
          <button
            key={key}
            role="radio"
            aria-checked={on ? "true" : "false"}
            onClick={() => {
              actions.setField("type", key);
              actions.autoNext("w2", actions.save);
            }}
            className={joinClassNames(styles.typeTile, tileClass(on))}
          >
            <span className={styles.typeIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={iconPath}></path>
              </svg>
            </span>
            <span className={styles.tileText}>
              <span className={styles.tileTitle}>{title}</span>
              <span className={styles.tileSub}>{subtitle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

/** Step 2: service categories; the first picked is Primary. */
export const StepServices = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions } = onboarding;
  const { categories } = state.form;
  const helpShown = !!view.shown.categories;

  return (
    <>
      <div
        role="group"
        aria-label="Service categories"
        className={joinClassNames(
          styles.catGrid,
          layout.isTabletOrWider ? styles.catGridMid : styles.catGridNarrow,
        )}
      >
        {CATEGORIES.map(({ key, title, iconPath }) => {
          const index = categories.indexOf(key);
          const on = index >= 0;

          return (
            <button
              key={key}
              aria-pressed={on ? "true" : "false"}
              onClick={() =>
                actions.setField(
                  "categories",
                  on
                    ? categories.filter((category) => category !== key)
                    : categories.concat([key]),
                  true,
                )
              }
              className={joinClassNames(styles.catTile, tileClass(on))}
            >
              <span className={styles.catIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={iconPath}></path>
                </svg>
              </span>
              <span className={joinClassNames(styles.tileText, styles.catText)}>
                <span className={styles.tileTitle}>{title}</span>
              </span>
              {on && index === 0 && (
                <span className={styles.primaryBadge}>Primary</span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="alert"
        className={joinClassNames(
          styles.catHelp,
          helpShown ? styles.helpError : styles.helpMuted,
        )}
      >
        {helpShown ? "Choose at least one" : ""}
      </div>
    </>
  );
};

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
      <label htmlFor="ob-biz" className={styles.label}>
        Business name
      </label>
      <input
        id="ob-biz"
        autoComplete="organization"
        value={form.businessName}
        onChange={(event) =>
          actions.setField("businessName", event.target.value)
        }
        onBlur={() => actions.touch("businessName")}
        aria-invalid={shown.businessName ? "true" : "false"}
        aria-describedby="ob-biz-help"
        className={joinClassNames(
          styles.input,
          shown.businessName ? styles.borderError : styles.border,
        )}
      />
      <div
        id="ob-biz-help"
        role="alert"
        className={joinClassNames(
          styles.help,
          shown.businessName ? styles.helpError : styles.helpMuted,
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
            value={form.postcode}
            onChange={(event) =>
              actions.setField("postcode", event.target.value)
            }
            onBlur={() => actions.touch("postcode")}
            aria-invalid={shown.postcode ? "true" : "false"}
            className={joinClassNames(
              styles.postcodeInput,
              shown.postcode ? styles.borderError : styles.border,
            )}
          />
          <div
            role="alert"
            className={joinClassNames(
              styles.help,
              shown.postcode ? styles.helpError : styles.helpMuted,
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
              fixture={(state.addressFinderFixture || "") as AddressFixture}
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
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.homeNoteIcon}
                  >
                    <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"></path>
                  </svg>
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

const getAriaInvalid = (invalid: boolean | undefined) => {
  if (invalid === undefined) return undefined;

  return invalid ? "true" : "false";
};

const Checkbox = ({
  checked,
  onChange,
  invalid,
  className,
  children,
}: {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  className: string | undefined;
  children: ReactNode;
}) => (
  <label className={className}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-invalid={getAriaInvalid(invalid)}
      className={styles.checkbox}
    />
    {children}
  </label>
);

/** Step 4: the stylist's account (8+ character password), business contact and Partner Terms. */
export const StepAccount = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions } = onboarding;
  const { form } = state;
  const { shown } = view;

  const text = (key: "first" | "last" | "email") => ({
    value: form[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      actions.setField(key, event.target.value),
    onBlur: () => actions.touch(key),
    error: shown[key] ?? "",
  });

  const { meter, role } = getOnboardingMeter(
    onboarding,
    layout.isDark,
    shown.password ?? "",
  );

  return (
    <>
      <div className={styles.nameRow}>
        <div className={styles.nameCell}>
          <WizardField
            id="ob-wfirst"
            label="First name"
            autoComplete="given-name"
            {...text("first")}
          />
        </div>
        <div className={styles.nameCell}>
          <WizardField
            id="ob-wlast"
            label="Last name"
            autoComplete="family-name"
            {...text("last")}
          />
        </div>
      </div>
      <WizardField
        id="ob-wemail"
        label="Email address"
        spacing="next"
        type="email"
        inputMode="email"
        autoComplete="email"
        {...text("email")}
      />
      <label htmlFor="ob-wmob" className={styles.labelNext}>
        Mobile
      </label>
      <div
        className={joinClassNames(
          styles.mobileWrap,
          shown.mobile ? styles.borderError : styles.border,
        )}
      >
        <span className={styles.prefix}>+44</span>
        <input
          id="ob-wmob"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={form.mobile}
          onChange={(event) => actions.setField("mobile", event.target.value)}
          onBlur={() => actions.touch("mobile")}
          aria-invalid={shown.mobile ? "true" : "false"}
          className={styles.mobileInput}
        />
      </div>
      <div role="alert" className={styles.error}>
        {shown.mobile ?? ""}
      </div>
      <label htmlFor="ob-wpw" className={styles.labelNext}>
        Password
      </label>
      <div className={styles.passwordWrap}>
        <input
          id="ob-wpw"
          type={state.passwordShown ? "text" : "password"}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => actions.setField("password", event.target.value)}
          onBlur={() => actions.touch("password")}
          aria-invalid={shown.password ? "true" : "false"}
          aria-describedby="ob-wpw-hint"
          className={joinClassNames(
            styles.passwordInput,
            shown.password ? styles.borderError : styles.border,
          )}
        />
        <button
          onClick={() =>
            actions.setState({ passwordShown: !state.passwordShown })
          }
          aria-label={state.passwordShown ? "Hide password" : "Show password"}
          className={styles.passwordToggle}
        >
          {state.passwordShown ? "Hide" : "Show"}
        </button>
      </div>
      <PasswordMeter id="ob-wpw-hint" view={meter} messageRole={role} />
      <Checkbox
        checked={form.useContact}
        onChange={(event) =>
          actions.setField("useContact", event.target.checked, true)
        }
        className={styles.useContact}
      >
        <span>Use these details for clients to contact me</span>
      </Checkbox>
      {!form.useContact && (
        <div className={styles.bizContact}>
          <label htmlFor="ob-bph" className={styles.label}>
            Business phone
          </label>
          <input
            id="ob-bph"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={form.businessPhone}
            onChange={(event) =>
              actions.setField("businessPhone", event.target.value)
            }
            className={styles.bizInput}
          />
          <label htmlFor="ob-bem" className={styles.bizEmailLabel}>
            Business email
          </label>
          <input
            id="ob-bem"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={form.businessEmail}
            onChange={(event) =>
              actions.setField("businessEmail", event.target.value)
            }
            className={styles.bizInput}
          />
          <div
            role="alert"
            className={joinClassNames(
              styles.bizHelp,
              shown.businessContact ? styles.helpError : styles.bizHelpMuted,
            )}
          >
            {shown.businessContact || "Add at least one"}
          </div>
        </div>
      )}
      <Checkbox
        checked={form.terms}
        onChange={(event) =>
          actions.setField("terms", event.target.checked, true)
        }
        invalid={!!shown.terms}
        className={styles.termsLabel}
      >
        <span>
          I agree to the{" "}
          <button
            onClick={() => actions.setState({ termsOn: "partner" })}
            className={styles.termsLink}
          >
            Partner Terms
          </button>{" "}
          and{" "}
          <button
            onClick={() => actions.setState({ termsOn: "privacy" })}
            className={styles.termsLink}
          >
            Privacy Policy
          </button>
          , and confirm I have the right to work in the UK and any insurance and
          licences my services need.
        </span>
      </Checkbox>
      <div role="alert" className={styles.termsError}>
        {shown.terms ?? ""}
      </div>
      {view.turnstileShown && (
        <OnboardingTurnstile
          isDark={layout.isDark}
          widgetRef={onboarding.turnstileRef}
          onToken={actions.setCaptchaToken}
        />
      )}
      {!!state.serverErrors.exists && (
        <div role="alert" className={styles.exists}>
          <span className={styles.existsText}>
            <span className={styles.existsTitle}>
              You already have an account with this email
            </span>
            <span className={styles.existsSub}>Your answers are saved.</span>
          </span>
          <button
            onClick={() => {
              actions.setState({ audience: "pro" });
              actions.goTo("pro-password");
            }}
            className={styles.loginInstead}
          >
            Log in instead
          </button>
        </div>
      )}
    </>
  );
};

/** Step 5: how they heard about us (optional; Skip goes straight to verify). */
export const StepSource = ({ onboarding, layout }: ScreenProps) => {
  const { state, actions } = onboarding;
  const { form } = state;

  return (
    <>
      <div
        role="radiogroup"
        aria-label="How you heard about us"
        className={styles.sources}
      >
        {SOURCES.map((source) => {
          const on = form.referralSource === source;

          return (
            <button
              key={source}
              role="radio"
              aria-checked={on ? "true" : "false"}
              onClick={() => actions.setField("referralSource", source)}
              className={joinClassNames(
                styles.source,
                on ? styles.sourceOn : styles.sourceOff,
              )}
            >
              <span className={styles.grow}>{source}</span>
              <span className={styles.sourceRing}>
                <span className={styles.sourceDot}></span>
              </span>
            </button>
          );
        })}
      </div>
      {form.referralSource === "Other" && (
        <div className={styles.otherWrap}>
          <label htmlFor="ob-other" className={styles.labelGap}>
            Where did you hear about us?
          </label>
          <input
            id="ob-other"
            value={form.referralSourceOther}
            onChange={(event) =>
              actions.setField("referralSourceOther", event.target.value)
            }
            maxLength={80}
            className={styles.otherInput}
          />
        </div>
      )}
      <OnboardingTurnstile
        isDark={layout.isDark}
        widgetRef={onboarding.turnstileRef}
        onToken={actions.setCaptchaToken}
      />
    </>
  );
};
