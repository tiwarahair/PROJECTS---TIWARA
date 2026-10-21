import { useMemo } from "react";
import { Navigate, useLocation } from "react-router";
import { PageMessage } from "../../components/page-message";
import { NotFoundPage } from "../page-states/not-found";
import { SiteHeader } from "../../components/site-header";
import { ProfileSkeleton } from "../../components/skeleton/profile-skeleton";
import type { ProfilePreview } from "../../components/skeleton/profile-skeleton";
import { toPublicStylist } from "../../lib/public-stylist";
import { useIsSlow } from "../../hooks/use-is-slow";
import { useGetStylistProfileQuery } from "../../stores/api-slice";
import { getLoginHref } from "./profile-facts";
import { StylistProfileView } from ".";
import styles from "../../styles/features/stylist-profile/route.module.css";

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

  if (!isFetching && !isError)
    return <NotFoundPage isStylistLink loginHref={getLoginHref(slug)} />;

  return (
    <div className={styles.page} aria-busy={isFetching}>
      <SiteHeader loginHref={getLoginHref(slug)} />
      {(isSlow || (isFetching && preview)) && (
        <ProfileSkeleton preview={preview} />
      )}
      {!isFetching && (
        <PageMessage
          title="We couldn’t load this page"
          text="Check your connection and try again."
          linkLabel="Find a stylist"
          linkHref="/search"
        />
      )}
    </div>
  );
};
