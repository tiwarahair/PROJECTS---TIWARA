import { TriangleAlert } from "lucide-react";
import type { AdminProfile } from "../../../lib/admin-api";
import { joinClassNames } from "../../../utils/class-names";
import { getCheckLabel, getCount } from "./view";
import styles from "../../../styles/features/admin/profiles.module.css";

interface ProfileBadgesProps {
  profile: AdminProfile;
}

export const ProfileBadges = ({ profile }: ProfileBadgesProps) => {
  const { status, checked_at: checkedAt, flags } = profile;

  return (
    <>
      <span
        className={joinClassNames(
          styles.checkTag,
          status === "suspended" && styles.checkSuspended,
          !checkedAt && status !== "suspended" && styles.checkWaiting,
        )}
      >
        {getCheckLabel(profile)}
      </span>
      {!!flags.length && (
        <span className={styles.flagTag}>
          <TriangleAlert size={13} strokeWidth={2.2} />
          {getCount(flags.length, "flag")}
        </span>
      )}
    </>
  );
};
