import { cx } from "../../utils/class-names";

export interface BookingNavProps {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  /* The confirm-and-pay button uses the green variant. */
  green?: boolean;
}

export function BookingNav({
  onBack,
  onNext,
  nextLabel,
  green,
}: BookingNavProps) {
  return (
    <div className="bp-nav-btns">
      <button className="bp-btn-back" onClick={onBack}>
        Back
      </button>
      <button className={cx("bp-btn-next", green && "green")} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}
