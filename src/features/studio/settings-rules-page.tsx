import type { ChangeEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import type { SettingsView } from "./settings-view";
import type { StudioController } from "./use-studio";
import parts from "../../styles/features/studio/settings-page-parts.module.css";
import styles from "../../styles/features/studio/settings-rules-page.module.css";

interface RuleOption {
  value: string | number;
  label: string;
}

interface RuleSelectRowProps {
  isLast?: boolean;
  title: string;
  hint: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  label: string;
  options: RuleOption[];
}

const RuleSelectRow = ({
  isLast = false,
  title,
  hint,
  value,
  onChange,
  label,
  options,
}: RuleSelectRowProps) => (
  <div className={isLast ? styles.ruleRowLast : styles.ruleRow}>
    <div className={parts.grow}>
      <div className={parts.title15}>{title}</div>
      <div className={styles.ruleHint}>{hint}</div>
    </div>
    <select
      className={styles.ruleSelect}
      value={value}
      onChange={onChange}
      aria-label={label}
    >
      {options.map(({ value: optionValue, label: optionLabel }) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  </div>
);

interface StepperProps {
  value: string;
  onDown: () => void;
  onUp: () => void;
  isDownOff: boolean;
  isUpOff: boolean;
  noun: string;
}

const Stepper = ({
  value,
  onDown,
  onUp,
  isDownOff,
  isUpOff,
  noun,
}: StepperProps) => (
  <div className={styles.stepper}>
    <button
      className={joinClassNames(
        styles.stepButton,
        isDownOff && styles.stepButtonOff,
      )}
      onClick={onDown}
      aria-label={`Less ${noun}`}
    >
      <Minus className={styles.blockSvg} size={16} strokeWidth={2} />
    </button>
    <div className={styles.stepValue}>{value}</div>
    <button
      className={joinClassNames(
        styles.stepButton,
        isUpOff && styles.stepButtonOff,
      )}
      onClick={onUp}
      aria-label={`More ${noun}`}
    >
      <Plus className={styles.blockSvg} size={16} strokeWidth={2} />
    </button>
  </div>
);

interface RulesPageProps {
  studio: StudioController;
  view: SettingsView;
}

/** Settings → Booking rules: booking window, default extra time, travel buffer. */
export const RulesPage = ({ studio, view }: RulesPageProps) => {
  const { rules, profile } = studio.state;

  return (
    <div className={styles.rules} data-screen-label="Booking rules">
      <div className={styles.panel}>
        <div className={parts.title15}>Booking window</div>
        <div className={parts.mutedTop}>When clients are allowed to book.</div>
        <div className={styles.windowNote}>
          Clients can book from{" "}
          <strong className={styles.strong}>{view.rulesMaxLabel}</strong> ahead
          until <strong className={styles.strong}>{view.rulesMinLabel}</strong>{" "}
          an appointment starts.
        </div>
        <RuleSelectRow
          title="Book up to"
          hint="How far into the future"
          value={String(rules.maxNotice)}
          onChange={view.onRulesMax}
          label="Maximum notice"
          options={view.rulesMaxOptions}
        />
        <RuleSelectRow
          isLast={true}
          title="Minimum notice"
          hint="Protects you from surprise bookings"
          value={String(rules.minNotice * 60)}
          onChange={view.onRulesMin}
          label="Minimum notice"
          options={view.rulesMinOptions}
        />
      </div>
      <div className={joinClassNames(styles.panel, styles.panelNext)}>
        <div className={parts.title15}>Default extra time after services</div>
        <div className={parts.hint}>
          Extra time that adds on to every service (example uses: clean-down and
          resetting your station). You can still change it per service.
        </div>
        <Stepper
          value={view.rulesExtra}
          onDown={view.rulesExtraDown}
          onUp={view.rulesExtraUp}
          isDownOff={rules.extra <= 0}
          isUpOff={rules.extra >= 30}
          noun="extra time"
        />
      </div>
      {profile.mobile && (
        <div
          className={joinClassNames(
            styles.panel,
            styles.panelNext,
            styles.panelIn,
          )}
        >
          <div className={parts.title15}>Travel buffer</div>
          <div className={parts.hint}>
            Time to get to your next client. Added after every booking, on top
            of any extra time.
          </div>
          <Stepper
            value={view.rulesTravel}
            onDown={view.rulesTravelDown}
            onUp={view.rulesTravelUp}
            isDownOff={rules.travel <= 0}
            isUpOff={rules.travel >= 120}
            noun="travel time"
          />
        </div>
      )}
      {!profile.mobile && (
        <div className={styles.travelOff}>
          <div className={parts.grow}>
            <div className={styles.travelTitle}>Travel buffer</div>
            <div className={parts.hint}>
              Only for stylists who travel to clients. Set your business type to
              Mobile in Business details to set one.
            </div>
          </div>
          <button
            className={styles.travelButton}
            onClick={() => studio.actions.openSubpage("business")}
          >
            Business details
          </button>
        </div>
      )}
    </div>
  );
};
