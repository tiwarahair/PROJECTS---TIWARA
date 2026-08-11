import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { cx } from "../../utils/class-names";
import { isOpen, useRouteSurfaces } from "../../hooks/use-route-surfaces";
import { useSurfaceNav } from "../../hooks/use-surface-nav";
import { bookingPath, stepFromPath } from "../../routes/routes";
import {
  BOOKING_STEP,
  buildSequence,
  firstUnansweredStep,
  type BookingStepIndex,
} from "../../types/booking";
import type { ServiceId } from "../../types/services";
import { formatPenceCompact } from "../../utils/money";
import { useBookingWizard } from "./use-booking-wizard";
import { StrandPreview } from "./strand-preview";
import { StepService } from "./step-service";
import { StepStyle } from "./step-style";
import { StepWhenWhere } from "./step-when-where";
import { StepStylist } from "./step-stylist";
import { StepCustomise } from "./step-customise";
import { StepSchedule } from "./step-schedule";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { StepConfirm } from "./step-confirm";
import {
  getCustomisableGroups,
  getIndividualService,
  getService,
  isCustomisable,
} from "../../data/services/services";
import {
  findStylist,
  findStylistBySlug,
  getOfferedServices,
  getOfferedStyles,
  getStyleRate,
} from "../../data/stylist/stylist";

// TO DO: READ

export function BookingOverlay() {
  const surfaces = useRouteSurfaces();
  const { close } = useSurfaceNav();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const optionsRef = useRef<HTMLDivElement>(null);

  const open = isOpen(surfaces, "booking");
  const contextStylist = findStylistBySlug(params.get("stylist") ?? undefined);
  const contextSlug = contextStylist?.slug;
  const stylistId = contextStylist?.id ?? null;
  const requestedService = params.get("service");
  const requestedStyle = params.get("style");

  // A service or style this stylist does not offer is treated as if it were
  // never in the URL, so the client is simply asked the question instead.
  const context = useMemo(() => {
    const serviceId =
      (getOfferedServices(stylistId).find(({ id }) => id === requestedService)
        ?.id as ServiceId | undefined) ?? null;
    const styleId = serviceId
      ? (getOfferedStyles(stylistId, serviceId).find(
          ({ id }) => id === requestedStyle,
        )?.id ?? null)
      : null;
    return {
      serviceId,
      styleId,
      stylistId,
      customisable: isCustomisable(serviceId),
    };
  }, [requestedService, requestedStyle, stylistId]);

  const { serviceId, styleId } = context;

  const goToStep = useCallback(
    (next: BookingStepIndex, chosenService?: ServiceId) =>
      navigate(
        bookingPath(next, {
          service: chosenService ?? serviceId ?? undefined,
          // A newly chosen service invalidates any style carried in the URL.
          style: chosenService ? undefined : (styleId ?? undefined),
          stylist: contextSlug,
        }),
      ),
    [navigate, serviceId, styleId, contextSlug],
  );

  // Opening from a stylist drops two steps, so which slugs are valid depends
  // on how the booking started.
  const sequence = buildSequence(context);
  const requested = stepFromPath(pathname);
  const inSequence = requested !== undefined && sequence.includes(requested);
  // Every step past the picker needs a service to describe; without one there
  // is nothing to show.
  const hasService = requested === BOOKING_STEP.service || serviceId !== null;
  const validStep = inSequence && hasService ? requested : undefined;

  // Bare `/book`, an unknown slug, a step this sequence skips, or a service
  // this stylist does not offer all fall back to the first open question.
  // Replaces rather than pushes, so Back does not bounce here.
  useEffect(() => {
    if (!open || validStep !== undefined) return;
    navigate(
      bookingPath(firstUnansweredStep(context), {
        service: serviceId ?? undefined,
        style: styleId ?? undefined,
        stylist: contextSlug,
      }),
      { replace: true },
    );
  }, [open, validStep, navigate, context, serviceId, styleId, contextSlug]);

  const wizard = useBookingWizard({
    context,
    step: validStep ?? firstUnansweredStep(context),
    open,
    goToStep,
  });
  const { booking, step, review } = wizard;

  // The options column scrolls back to the top on every step change.
  useEffect(() => {
    if (optionsRef.current) optionsRef.current.scrollTop = 0;
  }, [step]);

  // No service chosen yet means there is no category to name in the header.
  const headerLabel = booking.serviceId
    ? getService(booking.serviceId).label
    : "Book";
  const style = getIndividualService(
    booking.styleId,
    booking.serviceId ?? undefined,
  );

  // The stylist picked in the picker wins; otherwise fall back to whoever the
  // booking was opened for (a profile or a search card).
  const stylistName =
    findStylist(booking.stylistId)?.name ?? contextStylist?.name;

  const rate = booking.serviceId
    ? getStyleRate(booking.styleId, booking.serviceId, booking.stylistId)
    : null;

  return (
    <div id="bookingPage" className={cx("bp-overlay", open && "open")}>
      <div className="bp-header">
        <button className="bp-back" onClick={close}>
          Back
        </button>
        <span className="bp-cat-name">{headerLabel}</span>
        <div className="bp-step-counter">
          <div className="bp-step-dots">
            {/* One dot per step this booking will actually visit, so the
                shortened stylist flow shows six rather than eight. */}
            {sequence.map((entry, index) => (
              <div
                key={entry}
                className={cx(
                  "bp-step-dot",
                  index < sequence.indexOf(step) && "done",
                  entry === step && "active",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bp-body">
        {/* Every step panel stays mounted; `.bp-step-panel.active` shows one. */}
        <div className="bp-options" ref={optionsRef}>
          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.service && "active",
            )}
          >
            <StepService
              stylistId={booking.stylistId}
              stylistName={contextStylist?.name}
              selectedServiceId={booking.serviceId}
              onSelectService={wizard.selectService}
            />
          </div>

          {/* The panels below all describe a service, so they render only once
              one is chosen. The wrappers stay put either way, so the panel
              transitions are unaffected. */}
          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.style && "active",
            )}
          >
            {booking.serviceId && (
              <StepStyle
                serviceId={booking.serviceId}
                stylistId={booking.stylistId}
                selectedStyleId={booking.styleId}
                onSelectStyle={wizard.selectStyle}
                onBack={wizard.goPrev}
              />
            )}
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.whenWhere && "active",
            )}
          >
            <StepWhenWhere
              dateFrom={booking.dateFrom}
              dateTo={booking.dateTo}
              location={booking.location}
              onDateRangeChange={wizard.setDateRange}
              onLocationChange={wizard.setLocation}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.stylist && "active",
            )}
          >
            {booking.serviceId && (
              <StepStylist
                serviceId={booking.serviceId}
                location={booking.location}
                dateFrom={booking.dateFrom}
                dateTo={booking.dateTo}
                selectedStylistId={booking.stylistId}
                onSelectStylist={wizard.selectStylist}
                onBack={wizard.goPrev}
              />
            )}
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.customise && "active",
            )}
          >
            {booking.serviceId && (
              <StepCustomise
                serviceId={booking.serviceId}
                colourId={booking.colourId}
                lengthId={booking.lengthId}
                hairTextureId={booking.hairTextureId}
                size={booking.size}
                addOnIds={booking.addOnIds}
                onSelectColour={wizard.selectColour}
                onSelectLength={wizard.selectLength}
                onSelectHairTexture={wizard.selectHairTexture}
                onSelectSize={wizard.selectSize}
                onToggleAddOn={wizard.toggleAddOn}
                onBack={wizard.goPrev}
                onNext={wizard.goNext}
              />
            )}
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.schedule && "active",
            )}
          >
            <StepSchedule
              dayNumber={booking.dayNumber}
              timeSlotId={booking.timeSlotId}
              onSelectDay={wizard.selectDay}
              onSelectTime={wizard.selectTime}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.details && "active",
            )}
          >
            <StepDetails
              details={booking.details}
              onChange={wizard.updateDetails}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.review && "active",
            )}
          >
            <StepReview
              review={review}
              stylistName={stylistName || ""}
              onSelectPaymentPlan={wizard.selectPaymentPlan}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              step === BOOKING_STEP.confirm && "active",
            )}
          >
            <StepConfirm
              review={review}
              stylistName={stylistName || ""}
              onDone={close}
            />
          </div>
        </div>

        <StrandPreview
          serviceId={booking.serviceId}
          styleId={booking.styleId}
          colourId={booking.colourId}
          lengthId={booking.lengthId}
          stylistName={stylistName || ""}
          styleName={style?.label ?? ""}
          // No style chosen yet means no price to quote
          stylePrice={
            rate?.pricePence
              ? `from ${formatPenceCompact(rate.pricePence)}`
              : ""
          }
          groups={getCustomisableGroups(booking.serviceId)}
          chosenGroups={booking.chosenGroups}
          onCustomiseStep={step === BOOKING_STEP.customise}
        />
      </div>
    </div>
  );
}
