import Skeleton from "react-loading-skeleton";
import { ResponsiveImage } from "../responsive-image";
import { PROFILE_COVER_SIZES } from "../../utils/image-sources";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/skeleton/profile.module.css";

/** What a stylist card already knows, passed along so the profile's top shows straight away. */
export interface ProfilePreview {
  name: string;
  area: string;
  cover: string;
}

export interface ProfileSkeletonProps {
  preview?: ProfilePreview;
}

/** A stylist profile while it loads: cover, name, area and a few lines of bio. */
export const ProfileSkeleton = ({ preview }: ProfileSkeletonProps) => (
  <div aria-hidden="true" className={styles.page}>
    {preview?.cover && (
      <ResponsiveImage
        className={joinClassNames(styles.cover, styles.coverImage)}
        src={preview.cover}
        sizes={PROFILE_COVER_SIZES}
        loading="eager"
        fetchPriority="high"
        alt=""
      />
    )}
    {preview && !preview.cover && (
      <div className={joinClassNames(styles.cover, styles.coverPlaceholder)} />
    )}
    {!preview && <Skeleton className={styles.cover} />}
    {preview ? (
      <p className={styles.name}>{preview.name}</p>
    ) : (
      <Skeleton width="45%" height={40} className={styles.title} />
    )}
    {preview?.area ? (
      <p className={styles.area}>{preview.area}</p>
    ) : (
      <Skeleton width="30%" />
    )}
    <Skeleton count={3} className={styles.bio} />
  </div>
);
