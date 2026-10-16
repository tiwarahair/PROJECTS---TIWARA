import { joinClassNames } from "../../../../utils/class-names";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/reliability.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";

interface ProfileReliabilityProps {
  profile: Profile;
}

export const ProfileReliability = ({ profile }: ProfileReliabilityProps) => {
  const tiles = [
    { label: "No-shows", value: profile.noShows, isWarn: profile.hasNoShows },
    {
      label: "Late cancellations",
      value: profile.lateCancel,
      isWarn: profile.hasLateCancel,
    },
  ];

  return (
    <>
      <div className={shared.h3}>Reliability</div>
      <div className={shared.tiles}>
        {tiles.map(({ label, value, isWarn }) => (
          <div key={label} className={shared.tile}>
            <div
              className={joinClassNames(
                styles.tileValue,
                isWarn && styles.tileValueWarn,
              )}
            >
              {value}
            </div>
            <div className={shared.tileLabel}>{label}</div>
          </div>
        ))}
      </div>
    </>
  );
};
