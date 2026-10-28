import { useMemo, useState } from "react";
import { PageMessage } from "../../components/page-message";
import { SiteHeader } from "../../components/site-header";
import { MapsProvider } from "../../lib/google-maps";
import { toPublicStylist } from "../../lib/public-stylist";
import {
  useGetCatalogueQuery,
  useGetStylistProfileQuery,
} from "../../stores/api-slice";
import { getSearchParams } from "../../utils/page-flags";
import { BookingFlow } from "./page";
import styles from "../../styles/features/booking/route.module.css";

export const BookingPage = () => {
  const [slug] = useState(() => getSearchParams().get("stylist") ?? "");

  const {
    currentData: profile,
    isError,
    isFetching,
  } = useGetStylistProfileQuery(slug, { skip: !slug });

  const { data: catalogue, isError: isCatalogueError } = useGetCatalogueQuery();

  const publicStylist = useMemo(
    () => (profile ? toPublicStylist(profile) : null),
    [profile],
  );

  const canBook = !!publicStylist?.isTakingBookings;

  if (canBook && catalogue) {
    const flow = (
      <BookingFlow publicStylist={publicStylist} catalogue={catalogue} />
    );

    return publicStylist.stylist.mobile ? (
      <MapsProvider>{flow}</MapsProvider>
    ) : (
      flow
    );
  }

  const isWaiting = isFetching || (canBook && !isCatalogueError);

  const getMessage = () => {
    if (isError || (canBook && isCatalogueError))
      return {
        title: "We couldn’t load this page",
        text: "Check your connection and try again.",
        linkLabel: "Find a stylist",
        linkHref: "/search",
      };

    if (publicStylist)
      return {
        title: `${publicStylist.stylist.name} isn’t taking bookings right now`,
        text: "You can still see their profile and come back later.",
        linkLabel: "View profile",
        linkHref: `/${publicStylist.stylist.id}`,
      };

    return {
      title: "We couldn’t find this stylist",
      text: "The link may be wrong, or they’re no longer taking bookings here.",
      linkLabel: "Find a stylist",
      linkHref: "/search",
    };
  };

  return (
    <div className={styles.page} aria-busy={isWaiting}>
      <SiteHeader />
      {!isWaiting && <PageMessage {...getMessage()} />}
    </div>
  );
};
