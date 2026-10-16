import { EllipsisVertical, Plus } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { EditServiceView } from "../edit-view";
import styles from "../../../../styles/features/studio/bookings/steps/service-addons.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface ServiceAddonsProps {
  edit: EditServiceView;
}

export const ServiceAddons = ({ edit }: ServiceAddonsProps) => (
  <>
    <div className={styles.h3Spaced}>Service add-ons</div>
    <div className={styles.stack8}>
      {edit.addonRows.map(({ key, name, meta, edit: open, menu }) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          key={key}
          className={styles.addonRow}
          data-aorow="1"
          onClick={open}
        >
          <span className={shared.grow}>
            <span className={styles.addonName}>{name}</span>
            <span className={styles.addonMeta}>{meta}</span>
          </span>
          <button
            className={styles.addonMenu}
            onClick={menu}
            aria-label="Add-on options"
          >
            <EllipsisVertical size={17} />
          </button>
        </div>
      ))}
    </div>
    <button
      className={joinClassNames(shared.outlineButton, shared.addButton)}
      onClick={edit.openAddAddon}
    >
      <Plus size={15} strokeWidth={1.9} />
      Add
    </button>
  </>
);
