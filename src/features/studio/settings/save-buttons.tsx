import { AVAILABILITY_FORM_ID } from "./availability/use-availability-form";
import { PROFILE_FORM_ID } from "./profile/use-profile-form";
import type { SettingsView } from "./view";

export interface SaveButtonsProps {
  view: SettingsView;
  className: string | undefined;
  label: string;
}

export const SaveButtons = ({ view, className, label }: SaveButtonsProps) =>
  [
    {
      key: "availability",
      isShown: view.isAvailability,
      form: AVAILABILITY_FORM_ID,
    },
    { key: "profile", isShown: view.isProfile, form: PROFILE_FORM_ID },
    { key: "rules", isShown: view.isRules, onClick: view.saveRules },
  ]
    .filter(({ isShown }) => isShown)
    .map(({ key, form, onClick }) => (
      <button
        key={key}
        className={className}
        type={form ? "submit" : undefined}
        form={form}
        onClick={onClick}
      >
        {label}
      </button>
    ));
