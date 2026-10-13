import { Earnings } from "../../components/earnings/earnings";
import { joinClassNames } from "../../utils/class-names";
import { CLIENTS } from "./studio-data";
import { getClient, hasTwoFactor, isLive } from "./studio-model";
import type { StudioController } from "./use-studio";
import styles from "../../styles/features/studio/studio-earnings.module.css";

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

  return (
    <div
      className={joinClassNames(
        styles.earnings,
        isWide && styles.wide,
        isDesktop && styles.desk,
      )}
      data-screen-label="Earnings"
    >
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

          actions.showToast(
            `Showing past bookings for ${getClient(state, clientId).name}`,
          );
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
