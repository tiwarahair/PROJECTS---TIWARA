import { Plus } from "lucide-react";
import { useEffect } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import { getSavedId } from "../../clients/save";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "../sheet/view";
import { getPaneClass } from "./pane";
import { SearchField } from "./search-field";
import styles from "../../../../styles/features/studio/bookings/steps/change-client.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface ChangeClientStepProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const ChangeClientStep = ({ studio, view }: ChangeClientStepProps) => {
  const { state, setState, context } = studio;
  const { resumeChangeClient } = state;

  // back from adding the client's email: the change carries on
  useEffect(() => {
    if (!resumeChangeClient) return;

    setState({ resumeChangeClient: null });
    context.memo.setChangeClient?.(getSavedId(resumeChangeClient));
  }, [resumeChangeClient, setState, context]);

  return (
    <div className={getPaneClass(studio)}>
      <SearchField
        value={state.changeClientQuery || ""}
        onChange={(event) =>
          setState({ changeClientQuery: event.target.value })
        }
        placeholder="Search clients, or type a new name"
      />
      <button className={styles.newClient} onClick={view.openNewClient}>
        <span className={styles.plusDisc}>
          <Plus size={17} strokeWidth={1.9} />
        </span>
        <span className={shared.grow}>
          <span className={shared.optionName}>Add a new client</span>
        </span>
      </button>
      <div className={styles.clientList}>
        {view.changeRows.map(({ key, name, imgSrc, meta, isCurrent, pick }) => (
          <button
            key={key}
            className={joinClassNames(
              shared.clientOption,
              isCurrent && shared.optionOn,
            )}
            onClick={pick}
          >
            <img className={styles.avatar38} src={imgSrc} alt="" />
            <span className={shared.grow}>
              <span className={shared.optionName}>{name}</span>
              <span className={shared.optionSub}>{meta}</span>
            </span>
            <span className={shared.optionTag}>
              {isCurrent ? "Current" : ""}
            </span>
          </button>
        ))}
      </div>
      <button className={styles.walkIn} onClick={view.makeWalkIn}>
        <span className={shared.grow}>
          <span className={shared.optionName}>Leave empty for a walk-in</span>
          <span className={shared.optionSub}>The slot stays booked</span>
        </span>
      </button>
    </div>
  );
};
