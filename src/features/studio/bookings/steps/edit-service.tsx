import { ChevronRight } from "lucide-react";
import type { StudioController } from "../../core/use-studio";
import type { EditServiceView } from "../edit-view";
import { getPaneClass } from "./pane";
import { ServiceAddons } from "./service-addons";
import { ServicePrice } from "./service-price";
import { ServiceTiming } from "./service-timing";
import styles from "../../../../styles/features/studio/bookings/steps/edit-service.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface EditServiceStepProps {
  studio: StudioController;
  edit: EditServiceView;
}

export const EditServiceStep = ({ studio, edit }: EditServiceStepProps) => (
  <div className={getPaneClass(studio)}>
    <button className={styles.change} onClick={edit.openChange}>
      <span className={shared.grow}>
        <span className={styles.eyebrow}>{edit.categoryLabel}</span>
        <span className={styles.changeName}>{edit.serviceName}</span>
        <span className={styles.changeMeta}>{edit.serviceMeta}</span>
      </span>
      <span className={styles.changeLink}>
        Change
        <ChevronRight size={16} strokeWidth={1.7} />
      </span>
    </button>
    <ServiceTiming edit={edit} />
    <ServicePrice edit={edit} />
    <ServiceAddons edit={edit} />
  </div>
);
