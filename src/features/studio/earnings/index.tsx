import { skipToken } from "@reduxjs/toolkit/query";
import { Earnings } from "../../../components/earnings";
import type { EarningsProps } from "../../../components/earnings/use-earnings";
import { PageMessage } from "../../../components/page-message";
import { useGetStudioEarningsQuery } from "../../../stores/api-slice";
import { joinClassNames } from "../../../utils/class-names";
import { CLIENTS } from "../core/seed-clients";
import { getClient, hasTwoFactor, isLive } from "../core/model";
import type { StudioController } from "../core/use-studio";
import { getDisputeBanner } from "./dispute";
import { getFailedPayout, getLedgerClients, toLedger } from "./records";
import styles from "../../../styles/features/studio/earnings/index.module.css";

/** Studio → Earnings: the embedded Earnings dashboard. */
export const StudioEarnings = ({ studio }: { studio: StudioController }) => {
  const { state, setState, props, isWide, isDesktop, isNew, actions } = studio;
  const live = isLive(state);

  const getScenario = () => {
    if (isNew) return live ? "empty" : "setup";

    if (props.earnings && props.earnings !== "default") return props.earnings;

    return props.payouts === "paused" ? "paused" : "default";
  };

  const scenario = getScenario();
  const stylistId = state.account?.stylistId;

  const { data: loaded, isError } = useGetStudioEarningsQuery(
    stylistId ?? skipToken,
    { refetchOnMountOrArgChange: true },
  );

  const earnings = loaded ?? null;

  const { business, tax, payoutBank } = state;

  // a real account's money, the legal details its statements need, and its own Stripe for bank details
  const ledger = earnings && toLedger(earnings);

  const real: Partial<EarningsProps> =
    earnings && ledger
      ? {
          ledger: { ...ledger, scenario: live ? ledger.scenario : "setup" },
          dispute: getDisputeBanner(studio, earnings),
          clients: getLedgerClients(earnings),
          failedPayout: getFailedPayout(earnings),
          legalName: tax?.legalName ?? "",
          vatNumber: business.vatOn ? business.details?.vat : undefined,
          bankLabel: payoutBank ?? "your bank account",
          onUpdateBank: () => void actions.openStripeDashboard(),
        }
      : {};

  const className = joinClassNames(
    styles.earnings,
    isWide && styles.wide,
    isDesktop && styles.desk,
  );

  if (stylistId && !earnings)
    return (
      <div className={className} data-screen-label="Earnings">
        {isError && (
          <PageMessage
            title="Earnings didn’t load"
            text="Check your connection, then try again."
            linkLabel="Try again"
            linkHref="/studio"
            isReload
          />
        )}
      </div>
    );

  return (
    <div className={className} data-screen-label="Earnings">
      <Earnings
        scenario={scenario}
        layout="auto"
        contained={false}
        showTitle={true}
        clients={CLIENTS.map(({ id, name, email }) => ({
          id: id ?? "",
          name,
          email,
        }))}
        services={state.services}
        businessName={state.profile.salon}
        onOpenBooking={(_bookingRef, clientId) => {
          setState({
            tab: "bookings",
            bookingsLayout: "list",
            listScope: "past",
          });

          const name =
            real.clients?.find(({ id }) => id === clientId)?.name ??
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
        {...real}
      />
    </div>
  );
};
