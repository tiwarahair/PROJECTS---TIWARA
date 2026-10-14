import type { SearchController } from "./use-search";
import styles from "../../styles/features/search/location-prompt.module.css";

interface LocationPromptProps {
  search: SearchController;
}

/** Over "Current location" results when the location is blocked or unavailable. */
export const LocationPrompt = ({
  search: { place, location, refs, actions },
}: LocationPromptProps) => {
  if (!place.current) return null;

  if (location.status !== "denied" && location.status !== "unavailable")
    return null;

  // narrow screens hide the bar's Where field (compact pill); they get the search sheet's Where step
  const searchArea = () => {
    const field = refs.where.current;

    if (field?.offsetParent) field.focus();
    else actions.openMobileWhere();
  };

  return (
    <div className={styles.prompt}>
      <span>Location is off. Showing all stylists.</span>
      <button onClick={searchArea} className={styles.button}>
        Search an area instead
      </button>
    </div>
  );
};
