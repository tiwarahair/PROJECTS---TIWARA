import { joinClassNames } from "../../utils/class-names";
import { BUSINESS_TYPES, CATEGORIES, SOURCES } from "./data";
import { OnboardingTurnstile } from "./turnstile";
import type { ScreenProps } from "./screen-props";
import fieldStyles from "../../styles/features/onboarding/wizard-field.module.css";
import styles from "../../styles/features/onboarding/wizard-steps.module.css";

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
      {BUSINESS_TYPES.map(({ key, title, subtitle, icon: TypeIcon }) => {
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
              <TypeIcon size={20} strokeWidth={1.7} />
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
        {CATEGORIES.map(({ key, title, icon: CategoryIcon }) => {
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
                <CategoryIcon size={20} strokeWidth={1.7} />
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
          helpShown ? fieldStyles.helpError : fieldStyles.helpMuted,
        )}
      >
        {helpShown ? "Choose at least one" : ""}
      </div>
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
            {...actions.field("referralSourceOther")}
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
