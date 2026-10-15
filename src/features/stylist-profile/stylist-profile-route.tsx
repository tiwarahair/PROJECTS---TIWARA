import { useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { SiteHeader } from "../../components/site-header/site-header";
import { ProfileSkeleton } from "../../components/skeleton/profile-skeleton";
import type { ProfilePreview } from "../../components/skeleton/profile-skeleton";
import { toPublicStylist } from "../../lib/public-stylist";
import { useIsSlow } from "../../hooks/use-is-slow";
import { useGetStylistProfileQuery } from "../../stores/api-slice";
import { getLoginHref } from "./profile-facts";
import { StylistProfileView } from "./stylist-profile-page";
import styles from "../../styles/features/stylist-profile/stylist-profile-route.module.css";

/** Route "/{slug}": loads the profile; a retired slug redirects to the current one. */
export const StylistProfilePage = () => {
  const { pathname, state } = useLocation();
  const preview = (state as { preview?: ProfilePreview } | null)?.preview;
  const slug = pathname.split("/")[1] ?? "";

  // currentData: only this slug's result, never the previous profile's
  const {
    currentData: data,
    isError,
    isFetching,
  } = useGetStylistProfileQuery(slug, { refetchOnMountOrArgChange: 60 });

  const isSlow = useIsSlow(isFetching && !data);

  const publicStylist = useMemo(
    () => (data ? toPublicStylist(data) : null),
    [data],
  );

  if (data && data.slug !== slug)
    return <Navigate to={`/${data.slug}`} replace />;

  if (publicStylist)
    return <StylistProfileView key={slug} publicStylist={publicStylist} />;

  return (
    <div className={styles.page} aria-busy={isFetching}>
      <SiteHeader loginHref={getLoginHref(slug)} />
      {(isSlow || (isFetching && preview)) && (
        <ProfileSkeleton preview={preview} />
      )}
      {!isFetching && (
        <div className={styles.message}>
          <h1 className={styles.title}>
            {isError
              ? "We couldn’t load this page"
              : "We couldn’t find this stylist"}
          </h1>
          <p className={styles.text}>
            {isError
              ? "Check your connection and try again."
              : "The link may be wrong, or they’re no longer taking bookings here."}
          </p>
          <Link to="/search" className={styles.search}>
            Find a stylist
          </Link>
        </div>
      )}
    </div>
  );
};
