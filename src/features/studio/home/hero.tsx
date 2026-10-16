import { ChevronRight } from "lucide-react";
import { ResponsiveImage } from "../../../components/responsive-image/responsive-image";
import { joinClassNames } from "../../../utils/class-names";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/hero.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

interface TodayHeroProps {
  view: HomeView;
}

export const TodayHero = ({ view }: TodayHeroProps) => {
  const { today } = view;

  return (
    <section
      className={joinClassNames(shared.hero, shared.main)}
      data-screen-label="Today hero"
    >
      <ResponsiveImage
        className={styles.heroImage}
        src="site/hero.jpg"
        sizes="(min-width: 1024px) 900px, 100vw"
        loading="eager"
        fetchPriority="high"
        alt=""
      />
      <div className={styles.heroShade}></div>
      <div className={styles.heroBody}>
        <div className={styles.minWidth}>
          <div className={styles.heroEyebrow}>Today</div>
          <div className={shared.heroTitle}>
            {today.length === 0
              ? "Nothing booked"
              : today.length +
                (today.length === 1 ? " appointment" : " appointments")}
          </div>
          <div className={styles.heroNext}>{view.heroNext}</div>
        </div>
        <button className={shared.heroButton} onClick={view.goCalendarToday}>
          Open calendar
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
};
