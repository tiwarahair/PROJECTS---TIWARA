import { joinClassNames } from "../../../utils/class-names";
import { LinkCardBody, getSetupProgress } from "../shell";
import type { StudioController } from "../core/use-studio";
import { ActivityPanel } from "./activity";
import { DuePanel } from "./due";
import { GoLiveBanner } from "./gate";
import { TodayHero } from "./hero";
import { PolicyNudge } from "./nudge";
import { RevenueChart } from "./chart";
import { SetupBanner } from "./setup-banner";
import { OverviewStats } from "./stats";
import { TodayPanel } from "./today";
import { UpcomingPanel } from "./upcoming";
import { getHomeView } from "./view";
import styles from "../../../styles/features/studio/home/index.module.css";

interface StudioHomeProps {
  studio: StudioController;
}

export const StudioHome = ({ studio }: StudioHomeProps) => {
  const { state, isWide, isDesktop } = studio;
  const { isSetupOn, isComplete } = getSetupProgress(studio);
  const view = getHomeView(studio);

  return (
    <div
      className={joinClassNames(
        styles.home,
        isDesktop ? styles.homeDesk : isWide && styles.homeWide,
      )}
      data-screen-label="Home"
    >
      {view.isGate && <GoLiveBanner studio={studio} />}
      {!isWide && isSetupOn && !isComplete && <SetupBanner studio={studio} />}
      {!isWide && state.linkCard && (
        <section
          className={styles.linkReady}
          role="status"
          data-screen-label="Booking link ready"
        >
          <LinkCardBody studio={studio} />
        </section>
      )}
      {isSetupOn &&
        isComplete &&
        !state.linkCard &&
        !state.setupExit &&
        state.nudge && <PolicyNudge studio={studio} />}

      <TodayHero view={view} />
      <OverviewStats studio={studio} view={view} />
      <RevenueChart studio={studio} view={view} />
      <TodayPanel view={view} />
      {view.due.length > 0 && <DuePanel studio={studio} view={view} />}
      <UpcomingPanel studio={studio} view={view} />
      <ActivityPanel studio={studio} view={view} />
    </div>
  );
};
