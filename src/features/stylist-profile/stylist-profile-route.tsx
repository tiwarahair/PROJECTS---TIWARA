import { useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { SiteHeader } from "../../components/site-header/site-header";
import { toPublicStylist } from "../../lib/public-stylist";
import { useGetStylistProfileQuery } from "../../stores/api-slice";
import { getLoginHref } from "./profile-facts";
import { StylistProfileView } from "./stylist-profile-page";
import styles from "../../styles/features/stylist-profile/stylist-profile-route.module.css";

/** Route "/{slug}": loads the profile; a retired slug redirects to the current one. */
export const StylistProfilePage = () => {
  const { pathname } = useLocation();
  const slug = pathname.split("/")[1] ?? "";

  // currentData: only this slug's result, never the previous profile's
  const {
    currentData: data,
    isError,
    isFetching,
  } = useGetStylistProfileQuery(slug);

  const publicStylist = useMemo(
    () => (data?.profile ? toPublicStylist(data.profile) : null),
    [data],
  );

  if (publicStylist)
    return <StylistProfileView key={slug} publicStylist={publicStylist} />;

  if (data?.currentSlug && data.currentSlug !== slug)
    return <Navigate to={`/${data.currentSlug}`} replace />;

  return (
    <div className={styles.page} aria-busy={isFetching}>
      <SiteHeader loginHref={getLoginHref(slug)} />
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
