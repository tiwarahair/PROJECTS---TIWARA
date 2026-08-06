import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cx } from "../../utils/class-names";
import { FieldError } from "../../components/field-error";
import {
  bookingDetailsSchema,
  type BookingDetailsValues,
} from "../../schemas/booking-details";
import type { BookingDetails } from "../../types/booking";

export interface StepDetailsProps {
  details: BookingDetails;
  onChange: (patch: Partial<BookingDetails>) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * The wizard still owns the answers — this form keeps its own copy only so
 * React Hook Form can validate it, and pushes the trimmed values back up on a
 * successful submit, just before advancing to the review step.
 */
export function StepDetails({
  details,
  onChange,
  onBack,
  onNext,
}: StepDetailsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<BookingDetailsValues>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: details,
    mode: "onBlur",
  });
  console.log("getValues", getValues());

  const submit = handleSubmit((values) => {
    onChange(values);
    onNext();
  });

  /** Wires the shared class/aria/message treatment onto one field. */
  const fieldProps = (name: keyof BookingDetailsValues) => ({
    className: cx("bp-form-input", errors[name] && "bp-form-input--error"),
    "aria-invalid": Boolean(errors[name]),
    ...register(name),
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="bp-step-title">Your details</div>
      <div className="bp-step-sub">
        Just a few things to confirm your booking
      </div>

      <div className="bp-form-row">
        <div className="bp-form-group">
          <label className="bp-form-label" htmlFor="bp-first-name">
            First name
          </label>
          <input
            id="bp-first-name"
            placeholder="Amara"
            type="text"
            {...fieldProps("firstName")}
          />
          <FieldError
            className="bp-form-error"
            message={errors.firstName?.message}
          />
        </div>
        <div className="bp-form-group">
          <label className="bp-form-label" htmlFor="bp-last-name">
            Last name
          </label>
          <input
            id="bp-last-name"
            placeholder="Johnson"
            type="text"
            {...fieldProps("lastName")}
          />
          <FieldError
            className="bp-form-error"
            message={errors.lastName?.message}
          />
        </div>
      </div>

      <div className="bp-form-group">
        <label className="bp-form-label" htmlFor="bp-email">
          Email address
        </label>
        <input
          id="bp-email"
          placeholder="you@email.com"
          type="email"
          {...fieldProps("email")}
        />
        <FieldError className="bp-form-error" message={errors.email?.message} />
      </div>

      <div className="bp-form-group">
        <label className="bp-form-label" htmlFor="bp-phone">
          Phone number
        </label>
        <input
          id="bp-phone"
          placeholder="+44 7700 000000"
          type="tel"
          {...fieldProps("phone")}
        />
        <FieldError className="bp-form-error" message={errors.phone?.message} />
      </div>

      <div className="bp-form-group">
        <label className="bp-form-label" htmlFor="bp-notes">
          Notes (optional)
        </label>
        <textarea
          id="bp-notes"
          placeholder="e.g. colour-treated hair, reference photo in DMs…"
          {...fieldProps("notes")}
        />
        <FieldError className="bp-form-error" message={errors.notes?.message} />
      </div>

      {/* Not <BookingNav>: "next" has to be a real submit button so the browser
          and React Hook Form agree on what triggers validation. */}
      <div className="bp-nav-btns">
        <button type="button" className="bp-btn-back" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="bp-btn-next">
          Review booking →
        </button>
      </div>
    </form>
  );
}
