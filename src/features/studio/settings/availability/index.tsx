import type { ChangeEvent, CSSProperties } from "react";
import { CirclePause, Plus } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { SettingsView } from "../view";
import { TIMES } from "../../core/constants";
import type { StudioController } from "../../core/use-studio";
import { Field } from "../page-parts";
import {
  AVAILABILITY_FORM_ID,
  useAvailabilityForm,
} from "./use-availability-form";
import parts from "../../../../styles/features/studio/settings/page-parts.module.css";
import styles from "../../../../styles/features/studio/settings/availability/index.module.css";

interface TimeSelectProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

const TimeSelect = ({ value, onChange }: TimeSelectProps) => (
  <select
    className={styles.timeSelect}
    defaultValue={value}
    onChange={onChange}
  >
    {TIMES.map((time) => (
      <option key={time} value={time}>
        {time}
      </option>
    ))}
  </select>
);

interface SectionHeadProps {
  title: string;
  note: string;
  spaced?: boolean;
  onAdd?: () => void;
}

const SectionHead = ({
  title,
  note,
  spaced = false,
  onAdd,
}: SectionHeadProps) => (
  <div className={spaced ? styles.sectionHeadSpaced : styles.sectionHead}>
    <div className={parts.grow}>
      <div className={parts.title15}>{title}</div>
      <div className={parts.mutedTop}>{note}</div>
    </div>
    {onAdd && (
      <button type="button" className={styles.add} onClick={onAdd}>
        <Plus size={13} strokeWidth={2.2} />
        Add
      </button>
    )}
  </div>
);

interface ItemRowProps {
  title: string;
  reason: string;
  hex?: string;
  edit: () => void;
  remove: () => void;
}

const ItemRow = ({ title, reason, hex, edit, remove }: ItemRowProps) => (
  <div className={styles.itemRow}>
    {/* runtime: the blocked time's colour */}
    {hex !== undefined && (
      <span
        className={styles.dot}
        style={{ "--dot": hex } as CSSProperties}
      ></span>
    )}
    <div className={styles.flex1}>
      <div className={styles.itemTitle}>{title}</div>
      <div className={parts.muted}>{reason}</div>
    </div>
    <button type="button" className={styles.edit} onClick={edit}>
      Edit
    </button>
    <button type="button" className={styles.remove} onClick={remove}>
      Remove
    </button>
  </div>
);

interface AvailabilityPageProps {
  studio: StudioController;
  view: SettingsView;
}

/** Settings → Availability: pause, working hours, blocked time and closed periods. */
export const AvailabilityPage = ({ studio, view }: AvailabilityPageProps) => {
  const { pause } = view;

  const {
    handleSubmit,
    formState: { errors },
  } = useAvailabilityForm(studio.state.hours);

  return (
    <form
      id={AVAILABILITY_FORM_ID}
      className={styles.availability}
      data-screen-label="Availability"
      noValidate
      onSubmit={handleSubmit(view.saveAvailability)}
    >
      <div
        className={styles.pauseCard}
        data-screen-label="Pause online bookings"
      >
        <div className={styles.row12}>
          <div className={parts.grow}>
            <div className={parts.title15}>Pause online bookings</div>
            <div className={parts.hint}>
              You can still add bookings yourself. Existing bookings and sent
              payment links aren’t affected.
            </div>
          </div>
          <button
            type="button"
            className={styles.switchHit}
            onClick={view.togglePause}
            role="switch"
            aria-checked={pause.on ? "true" : "false"}
            aria-label="Pause online bookings"
          >
            <span
              className={joinClassNames(
                styles.switchTrack,
                pause.on && styles.switchTrackOn,
              )}
            >
              <span className={styles.switchKnob}></span>
            </span>
          </button>
        </div>
        {pause.on && (
          <div className={styles.pausePanel}>
            <div className={styles.untilRow}>
              <Field
                label={
                  <>
                    Until <span className={styles.optional}>(optional)</span>
                  </>
                }
              >
                <input
                  className={styles.dateInput}
                  type="date"
                  value={pause.until}
                  onChange={view.onPauseUntil}
                />
              </Field>
              {!!pause.until && (
                <button
                  type="button"
                  className={styles.clearDate}
                  onClick={view.clearPauseUntil}
                >
                  Clear date
                </button>
              )}
            </div>
            <div className={styles.pauseBanner} role="status">
              <CirclePause
                className={styles.bannerIcon}
                size={17}
                strokeWidth={1.8}
              />
              {view.pauseBanner}
            </div>
            <div className={styles.seeLabel}>What clients see</div>
            <div className={styles.preview} aria-hidden="true">
              <div className={styles.previewMain}>
                <div className={styles.previewSalon}>
                  {studio.state.profile.salon}
                </div>
                <div className={styles.notTaking}>
                  Not taking online bookings right now
                </div>
              </div>
              <span className={styles.previewBook}>Book</span>
            </div>
          </div>
        )}
      </div>
      <SectionHead
        title="Working hours"
        note="Clients can only book inside these hours."
      />
      <div className={styles.list}>
        {view.hourRows.map(
          ({ key, day, on, start, end, toggle, setStart, setEnd }, index) => (
            <div key={key} className={styles.hourItem}>
              <div className={styles.hourRow}>
                <button
                  type="button"
                  className={joinClassNames(
                    styles.daySwitch,
                    on && styles.daySwitchOn,
                  )}
                  onClick={toggle}
                  aria-label="Toggle day"
                >
                  <span className={styles.dayKnob}></span>
                </button>
                <div
                  className={joinClassNames(
                    styles.dayName,
                    on && styles.dayNameOn,
                  )}
                >
                  {day}
                </div>
                {on && (
                  <>
                    <TimeSelect value={start} onChange={setStart} />
                    <span className={styles.to}>to</span>
                    <TimeSelect value={end} onChange={setEnd} />
                  </>
                )}
                {!on && <span className={styles.closed}>Closed</span>}
              </div>
              {errors.hours?.[index]?.end && (
                <span className={styles.hourError} role="alert">
                  {errors.hours[index].end.message}
                </span>
              )}
            </div>
          ),
        )}
      </div>
      <SectionHead
        title="Blocked time"
        note="Breaks and personal time. Your working hours stay the same."
        spaced={true}
        onAdd={view.openBlock}
      />
      {view.blockedList.length === 0 && (
        <div className={styles.closed}>Nothing blocked yet.</div>
      )}
      <div className={styles.list}>
        {view.blockedList.map(
          ({ key, day, span, reason, hex, edit, remove }) => (
            <ItemRow
              key={key}
              title={`${day} · ${span}`}
              reason={reason}
              hex={hex}
              edit={edit}
              remove={remove}
            />
          ),
        )}
      </div>
      <SectionHead
        title="Closed periods"
        note="Holidays and time off. Online booking closes for the whole range."
        spaced={true}
        onAdd={view.openClosed}
      />
      {view.closedList.length === 0 && (
        <div className={styles.closed}>No closed periods yet.</div>
      )}
      <div className={styles.list}>
        {view.closedList.map(({ key, span, reason, edit, remove }) => (
          <ItemRow
            key={key}
            title={span}
            reason={reason}
            edit={edit}
            remove={remove}
          />
        ))}
      </div>
    </form>
  );
};
