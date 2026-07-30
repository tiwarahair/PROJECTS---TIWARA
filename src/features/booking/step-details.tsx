import type { BookingDetails } from "../../types/booking";
import { BookingNav } from "./booking-nav";

export interface StepDetailsProps {
  details: BookingDetails;
  onChange: (patch: Partial<BookingDetails>) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * These values are held in state but never displayed anywhere else — the
 * original never read them either. They are here so the inputs are controlled
 * rather than uncontrolled DOM.
 */
export function StepDetails({
  details: { firstName, lastName, email, phone, notes },
  onChange,
  onBack,
  onNext,
}: StepDetailsProps) {
  return (
    <>
      <div className="bp-step-title">Your details</div>
      <div className="bp-step-sub">
        Just a few things to confirm your booking
      </div>

      <div className="bp-form-row">
        <div className="bp-form-group">
          <label className="bp-form-label">First name</label>
          <input
            className="bp-form-input"
            placeholder="Amara"
            type="text"
            value={firstName}
            onChange={(event) => onChange({ firstName: event.target.value })}
          />
        </div>
        <div className="bp-form-group">
          <label className="bp-form-label">Last name</label>
          <input
            className="bp-form-input"
            placeholder="Johnson"
            type="text"
            value={lastName}
            onChange={(event) => onChange({ lastName: event.target.value })}
          />
        </div>
      </div>

      <div className="bp-form-group">
        <label className="bp-form-label">Email address</label>
        <input
          className="bp-form-input"
          placeholder="you@email.com"
          type="email"
          value={email}
          onChange={(event) => onChange({ email: event.target.value })}
        />
      </div>

      <div className="bp-form-group">
        <label className="bp-form-label">Phone number</label>
        <input
          className="bp-form-input"
          placeholder="+44 7700 000000"
          type="tel"
          value={phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </div>

      <div className="bp-form-group">
        <label className="bp-form-label">Notes (optional)</label>
        <textarea
          className="bp-form-input"
          placeholder="e.g. colour-treated hair, reference photo in DMs…"
          value={notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </div>

      <BookingNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Review booking →"
      />
    </>
  );
}
