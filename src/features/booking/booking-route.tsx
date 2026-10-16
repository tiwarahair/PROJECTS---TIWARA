import { useMemo, useState } from "react";
import { PageMessage } from "../../components/page-message/page-message";
import { SiteHeader } from "../../components/site-header/site-header";
import { MapsProvider } from "../../lib/google-maps";
import { toPublicStylist } from "../../lib/public-stylist";
import { useGetStylistProfileQuery } from "../../stores/api-slice";
import { getSearchParams } from "../../utils/page-flags";
import { BookingFlow } from "./booking-page";
import styles from "../../styles/features/booking/booking-route.module.css";

/** Route "/book?stylist={slug}": loads the stylist, then the booking flow (with Google for mobile stylists' addresses). */
export const BookingPage = () => {
  const [slug] = useState(() => getSearchParams().get("stylist") ?? "");

  const {
    currentData: profile,
    isError,
    isFetching,
  } = useGetStylistProfileQuery(slug, { skip: !slug });

  const publicStylist = useMemo(
    () => (profile ? toPublicStylist(profile) : null),
    [profile],
  );

  if (publicStylist?.isTakingBookings) {
    const flow = <BookingFlow publicStylist={publicStylist} />;

    return publicStylist.stylist.mobile ? (
      <MapsProvider>{flow}</MapsProvider>
    ) : (
      flow
    );
  }

  const getMessage = () => {
    if (isError)
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
    <div className={styles.page} aria-busy={isFetching}>
      <SiteHeader />
      {!isFetching && <PageMessage {...getMessage()} />}
    </div>
  );
};
