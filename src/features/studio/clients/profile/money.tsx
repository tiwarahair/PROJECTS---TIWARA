import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/money.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";

interface ProfileMoneyProps {
  profile: Profile;
}

export const ProfileMoney = ({ profile }: ProfileMoneyProps) => (
  <>
    <div className={shared.h3}>Money</div>
    <div className={shared.tiles}>
      {profile.money.map(({ key, label, value }) => (
        <div key={key} className={shared.tile}>
          <div className={styles.moneyValue}>{value}</div>
          <div className={shared.tileLabel}>{label}</div>
        </div>
      ))}
    </div>
  </>
);
