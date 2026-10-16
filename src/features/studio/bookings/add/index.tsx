import { ArrowLeft } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import { AddonPickerList } from "../steps";
import { NotesStep } from "./notes-step";
import { ProtectionStep } from "./protection-step";
import { ServiceEdit } from "./service-edit";
import { ServiceList } from "./service-list";
import type { AddBookingView } from "./view";
import { WhenStep } from "./when-step";
import { WhoStep } from "./who-step";
import styles from "../../../../styles/features/studio/bookings/add/index.module.css";

interface AddBookingSheetProps {
  studio: StudioController;
  view: AddBookingView;
}

/** The New booking sheet's body and its in-body footer. */
export const AddBookingSheet = ({ studio, view }: AddBookingSheetProps) => (
  <>
    <div className={styles.steps}>
      {view.steps.map(({ key, isOn }) => (
        <span
          key={key}
          className={joinClassNames(styles.stepBar, isOn && styles.stepBarOn)}
        ></span>
      ))}
    </div>
    {view.isStep1 && <WhoStep view={view} />}
    {view.isServiceList && <ServiceList view={view} />}
    {view.isServiceEdit && <ServiceEdit view={view} />}
    {view.isAddonPick && view.picker && (
      <AddonPickerList className={styles.addonPick} picker={view.picker} />
    )}
    {view.isStep3 && <WhenStep studio={studio} view={view} />}
    {view.isStep4 && <ProtectionStep view={view} />}
    {view.isStep5 && <NotesStep view={view} />}
    <div className={styles.footer}>
      {view.canBack && (
        <button className={styles.back} onClick={view.back}>
          <ArrowLeft size={14} strokeWidth={2.2} />
          Back
        </button>
      )}
      <button
        className={joinClassNames(
          styles.next,
          view.isDisabled && styles.nextOff,
        )}
        onClick={view.next}
        disabled={view.isDisabled}
      >
        {view.cta}
      </button>
    </div>
  </>
);
