import { useState } from "react";
import { cx } from "../../utils/class-names";
import { toDateInputValue } from "../../utils/dates";

export interface StepWhenWhereProps {
  dateFrom: string;
  dateTo: string;
  location: string;
  onDateRangeChange: (dateFrom: string, dateTo: string) => void;
  onLocationChange: (location: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Only the earliest date is required; the rest narrows the stylist list. */
export function StepWhenWhere({
  dateFrom,
  dateTo,
  location,
  onDateRangeChange,
  onLocationChange,
  onBack,
  onNext,
}: StepWhenWhereProps) {
  const [showError, setShowError] = useState(false);
  // Past dates are not selectable, matching the new-ui behaviour.
  const today = toDateInputValue(new Date());

  function findStylists() {
    if (!dateFrom) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onNext();
  }

  return (
    <>
      <div className="bp-step-title">When &amp; where?</div>
      <div className="bp-step-sub">
        Set your date window and location to find available stylists
      </div>

      <span className="bp-section-label">Date range</span>
      <div className="bp-daterange-row">
        <div className="bp-daterange-field">
          <label className="bp-date-label" htmlFor="bpDateFrom">
            Earliest
          </label>
          <input
            id="bpDateFrom"
            type="date"
            min={today}
            className={cx("bp-date-input", showError && "bp-input-error")}
            value={dateFrom}
            onChange={(event) => onDateRangeChange(event.target.value, dateTo)}
          />
        </div>
        <div className="bp-daterange-field">
          <label className="bp-date-label" htmlFor="bpDateTo">
            Latest
          </label>
          <input
            id="bpDateTo"
            type="date"
            min={today}
            className="bp-date-input"
            value={dateTo}
            onChange={(event) =>
              onDateRangeChange(dateFrom, event.target.value)
            }
          />
        </div>
      </div>

      <span className="bp-section-label bp-section-label--spaced">
        Your location
      </span>
      <div className="bp-location-row">
        <div className="bp-loc-icon">📍</div>
        <input
          type="text"
          className="bp-loc-input"
          placeholder="City or postcode — e.g. London, B1 1AA"
          aria-label="Your location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
        />
      </div>

      <div className="bp-nav-btns">
        <button className="bp-btn-back" onClick={onBack}>
          Back
        </button>
        <button className="bp-btn-next" onClick={findStylists}>
          Find stylists →
        </button>
      </div>
    </>
  );
}
