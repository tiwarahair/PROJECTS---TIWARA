import { cx } from "../../utils/class-names";
import { getOfferedServices } from "../../data/stylist/stylist";
import type { ServiceId } from "../../types/services";

export interface StepServiceProps {
  /** Narrows the list to what this stylist offers; null shows everything. */
  stylistId: string | null;
  stylistName?: string;
  selectedServiceId: ServiceId | null;
  onSelectService: (serviceId: ServiceId) => void;
}

/* No nav buttons — choosing a service advances on its own, like the style step. */
export function StepService({
  stylistId,
  stylistName,
  selectedServiceId,
  onSelectService,
}: StepServiceProps) {
  const services = getOfferedServices(stylistId);
  const from = stylistName ? ` from ${stylistName}` : "";

  return (
    <>
      <div className="bp-step-title">Choose your service</div>
      <div className="bp-step-sub">
        {services.length} service{services.length === 1 ? "" : "s"}
        {from} — select one to continue
      </div>
      <div className="bp-styles-grid">
        {services.map(({ id, label, description }) => (
          <div
            key={id}
            id={`svc-${id}`}
            className={cx(
              "bp-style-card",
              selectedServiceId === id && "selected",
            )}
            onClick={() => onSelectService(id)}
          >
            <div className="bp-style-img" />
            <div className="bp-style-body">
              <span className="bp-style-name">{label}</span>
              <span className="bp-style-meta">{description}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
