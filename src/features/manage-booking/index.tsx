import { ArrowLeft } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { PageMessage } from "../../components/page-message";
import { ManageBookingSkeleton } from "../../components/skeleton/manage-booking";
import { useIsSlow } from "../../hooks/use-is-slow";
import { usePrivateLink } from "../../hooks/use-private-link";
import {
  getErrorMessage,
  useGetManagedBookingQuery,
  useGetOwnerManageTokenQuery,
} from "../../stores/api-slice";
import { useAppSelector } from "../../stores/hooks";
import { getAssetUrl } from "../../utils/asset-url";
import { getSearchParams } from "../../utils/page-flags";
import "../../styles/features/manage-booking/global.module.css";
import { ManagedBooking } from "./managed-booking";
import { SecureLink } from "./secure-link";
import styles from "../../styles/features/manage-booking/index.module.css";

export interface ManageBookingPageProps {
  view?: "booking" | "account";
}

const MESSAGES = {
  error: {
    title: "We couldn’t load your booking",
    text: "Check your connection and try again.",
  },
  missing: {
    title: "Open this from your booking email",
    text: "For your security, this page only opens from the link in your booking email. Copying the address from your browser won’t work.",
  },
  invalid: {
    title: "This link isn’t valid",
    text: "Manage links work until 30 days after the appointment. Use the link in your latest booking email.",
  },
};

const getMessage = (isError: boolean, hasToken: boolean) => {
  if (isError) return MESSAGES.error;

  return hasToken ? MESSAGES.invalid : MESSAGES.missing;
};

/**
 * The booking-link page, route "/manage?token=": the booking, changing its time once, cancelling, and the
 * allergies shared with the stylist. ?ref= opens a signed-in client's own booking; ?view=account forwards to Account → Shared.
 */
export const ManageBookingPage = ({
  view = "booking",
}: ManageBookingPageProps) => {
  const [params] = useState(getSearchParams);
  const ref = params.get("ref") ?? "";
  const isAccount = (params.get("view") || view) === "account";
  const { ready, loggedIn } = useAppSelector(({ session }) => session);
  const linkToken = usePrivateLink({ storageKey: "tw_manage_token" });
  const secureToken = usePrivateLink({ param: "secure" });
  const isOwnerLink = !!ref && !params.get("token");

  // each call makes a new token, so it isn't refetched behind the page
  const owner = useGetOwnerManageTokenQuery(ref, {
    skip: !isOwnerLink || !loggedIn,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const token = isOwnerLink ? (owner.currentData ?? "") : linkToken;

  const {
    currentData: booking,
    isFetching,
    isError,
    refetch,
  } = useGetManagedBookingQuery(token, {
    skip: !token || isAccount || !!secureToken,
  });

  const isLoading = isFetching || owner.isFetching || (isOwnerLink && !ready);

  const isLoadError =
    isError ||
    (owner.isError && getErrorMessage(owner.error) !== "link_not_valid");

  const isSlow = useIsSlow(isLoading && !booking);

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");

    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  if (isAccount) return <Navigate to="/account?section=shared" replace />;

  if (isOwnerLink && ready && !loggedIn) {
    const back = encodeURIComponent(`/manage?ref=${encodeURIComponent(ref)}`);

    return <Navigate to={`/login?screen=cust-email&return=${back}`} replace />;
  }

  const getContent = () => {
    if (secureToken) return <SecureLink token={secureToken} />;

    if (booking)
      return (
        <ManagedBooking
          booking={booking}
          token={token}
          onRefresh={() => void refetch()}
        />
      );

    if (isSlow) return <ManageBookingSkeleton />;

    if (isLoading) return null;

    return (
      <PageMessage
        {...getMessage(isLoadError, !!token || isOwnerLink)}
        linkLabel="Go to Tiwára’s House"
        linkHref="/"
      />
    );
  };

  return (
    <div data-screen-label="Manage booking" className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.bar}>
          <Link to="/" className={styles.logoLink}>
            <img
              src={getAssetUrl("logos/logo-crimson-sm.png")}
              alt="Tiwára's House"
              className={styles.logo}
            />
          </Link>
          {!!booking && (
            <span className={styles.who}>{`Booking ref ${booking.ref}`}</span>
          )}
        </div>
      </nav>
      <main className={styles.main} aria-busy={isLoading}>
        {isOwnerLink && (
          <Link to="/account?section=bookings" className={styles.back}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Your bookings
          </Link>
        )}
        {getContent()}
      </main>
    </div>
  );
};
