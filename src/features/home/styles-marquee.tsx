import { DarkBandSkeleton } from "../../components/skeleton/dark-band";
import { useGetCatalogueQuery } from "../../stores/api-slice";
import { GROUP_PLACEHOLDERS } from "./group-placeholders";
import { joinClassNames } from "../../utils/class-names";
import page from "../../styles/features/home/index.module.css";
import styles from "../../styles/features/home/styles-marquee.module.css";

/** Ink band of service-group names scrolling forever; the second copy is for the seamless loop. */
export const StylesMarquee = () => {
  const { data: catalogue, isLoading } = useGetCatalogueQuery();

  const getNames = (isCopy: boolean) =>
    isLoading
      ? GROUP_PLACEHOLDERS.map((key) => (
          <DarkBandSkeleton key={key} variant="name" />
        ))
      : catalogue?.groups.map(({ id, name }) => (
          <span
            key={id}
            aria-hidden={isCopy || undefined}
            className={styles.name}
          >
            {name}
          </span>
        ));

  return (
    <div
      data-bg="#1a1714"
      data-screen-label="Styles marquee"
      className={styles.marquee}
    >
      <div className={joinClassNames(page.mqTrack, styles.track)}>
        <div className={styles.group}>{getNames(false)}</div>
        <div className={styles.group}>{getNames(true)}</div>
      </div>
    </div>
  );
};
