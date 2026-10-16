import { CircleAlert, Plus } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { EditServiceView } from "../edit-view";
import { SelectOptions } from "./select-options";
import styles from "../../../../styles/features/studio/bookings/steps/service-timing.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface ServiceTimingProps {
  edit: EditServiceView;
}

export const ServiceTiming = ({ edit }: ServiceTimingProps) => (
  <>
    <div className={styles.twoCols}>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>Start time</span>
        <select
          className={joinClassNames(
            styles.timeSelect,
            edit.hasClash && styles.timeSelectClash,
          )}
          value={edit.time}
          onChange={edit.onTime}
        >
          <SelectOptions options={edit.timeOptions} />
        </select>
      </label>
      <div className={shared.minWidth}>
        <div className={styles.label135}>Duration</div>
        <div className={styles.row8}>
          <select
            className={styles.durSelect}
            value={edit.durationHours}
            onChange={edit.onDurationHours}
            aria-label="Hours"
          >
            <SelectOptions options={edit.hourOptions} />
          </select>
          <select
            className={styles.durSelect}
            value={edit.durationMinutes}
            onChange={edit.onDurationMinutes}
            aria-label="Minutes"
          >
            <SelectOptions options={edit.minuteOptions} />
          </select>
        </div>
      </div>
    </div>
    {!!edit.clashText && (
      <>
        <div className={styles.clash}>
          <CircleAlert className={styles.iconTop} size={15} strokeWidth={1.7} />
          <span>{edit.clashText}</span>
        </div>
        <div className={styles.nextFree}>
          <span className={styles.nextLabel}>Next available</span>
          {edit.nextFree.map(({ key, label, pick }) => (
            <button key={key} className={styles.nextTime} onClick={pick}>
              {label}
            </button>
          ))}
          {edit.nextFree.length === 0 && (
            <span className={shared.muted135}>Nothing else free today</span>
          )}
        </div>
      </>
    )}
    <div className={styles.extraGrid}>
      {edit.hasExtra && (
        <label className={shared.field}>
          <span className={styles.extraLabel}>
            Extra time
            <button className={styles.removeLink} onClick={edit.clearExtra}>
              Remove
            </button>
          </span>
          <select
            className={styles.select}
            value={edit.extra}
            onChange={edit.onExtra}
          >
            <SelectOptions options={edit.extraOptions} />
          </select>
        </label>
      )}
    </div>
    {!edit.hasExtra && (
      <button className={shared.outlineButton} onClick={edit.addExtra}>
        <Plus size={15} strokeWidth={1.9} />
        Add extra time
      </button>
    )}
  </>
);
