import { Earnings } from "../../components/earnings/earnings";
import { joinClassNames } from "../../utils/class-names";
import { CLIENTS } from "./studio-data";
import { getClient, hasTwoFactor, isLive } from "./studio-model";
import type { StudioController } from "./use-studio";
import styles from "./studio-earnings.module.css";

/** Studio → Earnings: the embedded Earnings dashboard (prototype Studio.dc.html line 906). */
export const StudioEarnings = ({ studio }: { studio: StudioController }) => {
  const { state, setState, props, isWide, isDesk, isNew, actions } = studio;
  const live = isLive(state);
  const scenario = isNew
    ? live
      ? "empty"
      : "setup"
    : props.earnings && props.earnings !== "default"
      ? props.earnings
      : props.payouts === "paused"
        ? "paused"
        : "default";
  return (
    <div
      className={joinClassNames(
        styles.earnings,
        isWide && styles.wide,
        isDesk && styles.desk,
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
        businessName={state.profile.salon || "Tiwára's House"}
        onOpenBooking={(_bookingRef, clientId) => {
          setState({ tab: "bookings", bview: "list", listScope: "past" });
          actions.toastMsg(
            "Showing past bookings for " + getClient(state, clientId).name,
          );
        }}
        onContinueSetup={() => {
          setState({ tab: "home", setupMin: false });
          if (!live) actions.openTf("secure");
        }}
        taxHold={!!state.check.stripe && !state.tax}
        onAddTax={() => {
          setState({ tab: "settings", page: "payouts" });
          if (hasTwoFactor(state)) setState({ taxEdit: true });
          else actions.openTf("secure");
        }}
      />
    </div>
  );
};
