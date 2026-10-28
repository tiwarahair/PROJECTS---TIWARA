import { skipToken } from "@reduxjs/toolkit/query";
import { Earnings } from "../../../components/earnings";
import { ListSkeleton } from "../../../components/list-skeleton";
import { PageMessage } from "../../../components/page-message";
import { useGetStudioEarningsQuery } from "../../../stores/api-slice";
import { joinClassNames } from "../../../utils/class-names";
import { getBookingLink, getClient, hasTwoFactor, isLive } from "../core/model";
import type { StudioController } from "../core/use-studio";
import { getDisputeBanner } from "./dispute";
import { getFailedPayout, getLedgerClients, toLedger } from "./records";
import styles from "../../../styles/features/studio/earnings/index.module.css";

/** Studio → Earnings: the embedded Earnings dashboard. */
export const StudioEarnings = ({ studio }: { studio: StudioController }) => {
  const { state, setState, isWide, isDesktop, actions } = studio;
  const live = isLive(state);
  const { stylistId } = state.account;

  const { data: earnings, isError } = useGetStudioEarningsQuery(
    stylistId || skipToken,
    { refetchOnMountOrArgChange: true },
  );

  const { business, tax, payoutBank } = state;

  const className = joinClassNames(
    styles.earnings,
    isWide && styles.wide,
    isDesktop && styles.desk,
  );

  if (!stylistId || !earnings)
    return (
      <div className={className} data-screen-label="Earnings">
        {isError ? (
          <PageMessage
            title="Earnings didn’t load"
            text="Check your connection, then try again."
            linkLabel="Try again"
            linkHref="/studio"
            isReload
          />
        ) : (
          <ListSkeleton isWide={isWide} />
        )}
      </div>
    );

  // a real account's money, the legal details its statements need, and its own Stripe for bank details
  const ledger = toLedger(earnings);
  const clients = getLedgerClients(earnings);

  return (
    <div className={className} data-screen-label="Earnings">
      <Earnings
        bookingLink={getBookingLink(state)}
        layout="auto"
        contained={false}
        showTitle={true}
        ledger={{ ...ledger, scenario: live ? ledger.scenario : "setup" }}
        clients={clients}
        dispute={getDisputeBanner(studio, earnings)}
        failedPayout={getFailedPayout(earnings)}
        legalName={tax?.legalName ?? ""}
        vatNumber={business.vatOn ? business.details?.vat : undefined}
        bankLabel={payoutBank || "your bank account"}
        onUpdateBank={() => void actions.openStripeDashboard()}
        businessName={state.profile.salon}
        onOpenBooking={(_bookingRef, clientId) => {
          setState({
            tab: "bookings",
            bookingsLayout: "list",
            listScope: "past",
          });

          const name =
            clients.find(({ id }) => id === clientId)?.name ??
            getClient(state, clientId).name;

          actions.showToast(`Showing past bookings for ${name}`);
        }}
        onContinueSetup={() => {
          setState({ tab: "home", setupMinimised: false });

          if (!live) actions.openTwoFactor("secure");
        }}
        taxHold={!!state.check.stripe && !state.tax}
        onAddTax={() => {
          setState({ tab: "settings", page: "payouts" });

          if (hasTwoFactor(state)) setState({ taxEdit: true });
          else actions.openTwoFactor("secure");
        }}
      />
    </div>
  );
};
