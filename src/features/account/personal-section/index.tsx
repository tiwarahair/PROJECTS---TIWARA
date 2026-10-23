import type { EditKey } from "../logic";
import type { AccountController } from "../use-account";
import { DetailRow } from "./detail-row";
import { PhotoRow } from "./photo-row";
import { useEditForm } from "./use-edit-form";
import styles from "../../../styles/features/account/personal-section/index.module.css";
import ui from "../../../styles/features/account/ui.module.css";

interface PersonalSectionProps {
  account: AccountController;
  initials: string;
}

/** Personal details: profile photo, name / email / mobile rows with inline edit, and the email-change code step. */
export const PersonalSection = ({
  account,
  initials,
}: PersonalSectionProps) => {
  const personal = useEditForm(account);
  const { profile } = account.state;

  const rows: [EditKey, string, string][] = [
    ["name", "Full name", `${profile.first} ${profile.last}`],
    ["email", "Email", profile.email],
    ["mobile", "Mobile", `+44 ${profile.mobile}`],
  ];

  return (
    <section data-screen-label="Account: Personal details">
      <div className={ui.list}>
        <PhotoRow account={account} initials={initials} />
        {rows.map(([key, label, value]) => (
          <DetailRow
            key={key}
            personal={personal}
            editKey={key}
            label={label}
            value={value}
          />
        ))}
      </div>
      <p className={styles.footnote}>
        Stylists you’ve booked with see these details so they can contact you
        about your appointments.
      </p>
    </section>
  );
};
