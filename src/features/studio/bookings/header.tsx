import { Calendar, List } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { DatePicker } from "./date-picker";
import { SearchBar } from "./search-bar";
import type { BookingsView } from "./view";
import { WeekStrip } from "./week-strip";
import styles from "../../../styles/features/studio/bookings/header.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

const VIEW_SEGMENTS = [
  {
    id: "cal",
    label: "Calendar",
    icon: Calendar,
  },
  {
    id: "list",
    label: "List",
    icon: List,
  },
];

interface BookingsHeaderProps {
  studio: StudioController;
  view: BookingsView;
}

export const BookingsHeader = ({ studio, view }: BookingsHeaderProps) => {
  const { state, setState, isWide, actions } = studio;

  const isOn = (id: string) =>
    state.bookingsLayout === id || (id === "cal" && !view.isList);

  return (
    <div
      className={joinClassNames(
        shared.header,
        !view.isList && state.calendarMode === "week" && shared.headerFlat,
      )}
    >
      <div className={shared.controls}>
        <div className={shared.controlRow}>
          <div className={styles.segments}>
            {VIEW_SEGMENTS.map(({ id, label, icon: SegmentIcon }) => (
              <button
                key={id}
                className={joinClassNames(
                  shared.segment,
                  shared.viewSegment,
                  isOn(id) && shared.segmentOn,
                )}
                onClick={() =>
                  actions.setCalendar({
                    bookingsLayout: id,
                    datePickerOpen: false,
                  })
                }
                title={label}
                aria-label={label}
              >
                <SegmentIcon
                  className={styles.noShrink}
                  size={16}
                  strokeWidth={1.8}
                />
                {isWide && <span>{label}</span>}
              </button>
            ))}
          </div>
          {view.isCalendar && (
            <>
              <div className={styles.segments}>
                {[
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    className={joinClassNames(
                      shared.segment,
                      shared.modeSegment,
                      (state.calendarMode || "day") === id && shared.segmentOn,
                    )}
                    onClick={() => actions.setCalendar({ calendarMode: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className={joinClassNames(
                  shared.today,
                  state.dayIndex === 0 && shared.todayOff,
                )}
                onClick={() => actions.setCalendar({ dayIndex: 0 })}
                disabled={state.dayIndex === 0}
              >
                Today
              </button>
            </>
          )}
          {view.isList && (
            <div className={styles.segments}>
              {[
                { id: "upcoming", label: "Upcoming" },
                { id: "past", label: "Past" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={joinClassNames(
                    shared.segment,
                    shared.scopeSegment,
                    (state.listScope || "upcoming") === id && shared.segmentOn,
                  )}
                  onClick={() => setState({ listScope: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {view.isCalendar && (
        <>
          <DatePicker studio={studio} view={view} />
          <WeekStrip view={view} />
        </>
      )}
      {view.isList && <SearchBar studio={studio} view={view} />}
    </div>
  );
};
