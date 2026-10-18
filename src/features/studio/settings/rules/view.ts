// Studio → Settings → Booking rules.
import type { ChangeEvent } from "react";
import { saveBookingRules } from "../../../../lib/studio-api/settings";
import { formatDuration } from "../../../../utils/dates";
import { getSettingsSave } from "../save";
import { formatMinutes } from "../../core/format";
import type { StudioController } from "../../core/use-studio";

const MIN_OPTIONS: [number, string][] = [
  [0, "Immediately"],
  [30, "30 minutes"],
  [60, "1 hour"],
  [120, "2 hours"],
  [180, "3 hours"],
  [240, "4 hours"],
  [300, "5 hours"],
  [420, "7 hours"],
  [720, "12 hours"],
  [1440, "24 hours"],
  [2880, "48 hours"],
  [4320, "3 days"],
  [5760, "4 days"],
  [7200, "5 days"],
  [10080, "1 week"],
  [20160, "2 weeks"],
];

export const getRulesView = (studio: StudioController) => {
  const { state, setState, actions } = studio;
  const { showToast, leavePage } = actions;
  const { sync, markSaved } = getSettingsSave(studio);
  const rules = state.rules;

  const setRules = (patch: Partial<typeof rules>) =>
    setState({ rules: { ...rules, ...patch } });

  const minLabel = (MIN_OPTIONS.find(
    ([value]) => value === rules.minNotice * 60,
  ) ?? [0, "24 hours"])[1];

  const example = state.services.find(
    ({ status, durationHours, durationMinutes }) =>
      status === "active" && (durationHours || durationMinutes),
  ) ?? {
    name: "silk press",
    durationHours: 2,
    durationMinutes: 30,
  };

  const exampleMinutes =
    (example.durationHours || 0) * 60 + (example.durationMinutes || 0);

  const asBlock = (minutes: number) => formatDuration(minutes);

  const saveRules = () => {
    const { saved, restoreSaved } = markSaved({ rules });

    sync?.save(
      (stylistId) =>
        saveBookingRules({
          stylist_id: stylistId,
          min_notice_hours: rules.minNotice,
          max_notice_months: rules.maxNotice,
          default_extra_minutes: rules.extra,
          travel_buffer_minutes: rules.travel,
        }),
      { rules: saved?.rules ?? rules },
      restoreSaved,
    );

    showToast("Booking rules saved");

    if (state.page) leavePage();
  };

  const getExtraExample = () => {
    if (!rules.extra)
      return "Services block only their own duration unless you set extra time on them.";

    const serviceBlock = asBlock(exampleMinutes);
    const exampleName = example.name.toLowerCase();
    const totalBlock = asBlock(exampleMinutes + rules.extra);

    return `A ${serviceBlock} ${exampleName} blocks ${totalBlock} in your calendar.`;
  };

  return {
    rulesMaxLabel:
      rules.maxNotice + (rules.maxNotice === 1 ? " month" : " months"),
    rulesMinLabel:
      rules.minNotice === 0 ? "the moment" : `${minLabel.toLowerCase()} before`,
    rulesMaxOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((months) => ({
      value: String(months),
      label: months + (months === 1 ? " month" : " months"),
    })),
    onRulesMax: (event: ChangeEvent<HTMLSelectElement>) =>
      setRules({ maxNotice: parseInt(event.target.value) }),
    rulesMinOptions: MIN_OPTIONS.map(([value, label]) => ({
      value: String(value),
      label,
    })),
    onRulesMin: (event: ChangeEvent<HTMLSelectElement>) =>
      setRules({ minNotice: parseInt(event.target.value) / 60 }),
    rulesExtra: formatMinutes(rules.extra),
    rulesExtraDown: () => setRules({ extra: Math.max(0, rules.extra - 5) }),
    rulesExtraUp: () => setRules({ extra: Math.min(30, rules.extra + 5) }),
    rulesExtraExample: getExtraExample(),
    rulesTravel: formatMinutes(rules.travel),
    rulesTravelDown: () => setRules({ travel: Math.max(0, rules.travel - 5) }),
    rulesTravelUp: () => setRules({ travel: Math.min(120, rules.travel + 5) }),
    saveRules,
  };
};
