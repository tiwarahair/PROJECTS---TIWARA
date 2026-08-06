import { cx } from "../../utils/class-names";
import { useNavigate } from "react-router";
import { searchPath } from "../../routes/routes";
import { filterStylists, stylistCountLabel } from "../../utils/filter-stylists";
import { StarRating } from "../../components/star-rating";
import { getService } from "../../data/services/services";
import type { ServiceId } from "../../types/services";
import { STYLISTS } from "../../data/stylist/stylist";

export interface StepStylistProps {
  serviceId: ServiceId;
  location: string;
  dateFrom: string;
  dateTo: string;
  selectedStylistId: string | null;
  onSelectStylist: (stylistId: string) => void;
  onBack: () => void;
}

/** "12 Jul" — the short form used in the results summary line. */
function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function buildResultsSummary(
  count: number,
  serviceName: string,
  location: string,
  dateFrom: string,
  dateTo: string,
): string {
  const where = location.trim() ? ` near ${location.trim()}` : " across the UK";
  const from = formatDate(dateFrom);
  const to = formatDate(dateTo);
  const when = from ? ` · ${from}${to ? ` – ${to}` : ""}` : "";
  return `${stylistCountLabel(count)} for ${serviceName}${where}${when}`;
}

/** No Continue button — picking a stylist advances on its own. */
export function StepStylist({
  serviceId,
  location,
  dateFrom,
  dateTo,
  selectedStylistId,
  onSelectStylist,
  onBack,
}: StepStylistProps) {
  const navigate = useNavigate();
  const available = filterStylists(STYLISTS, {
    style: serviceId,
    location,
  });

  return (
    <>
      <div className="bp-step-title">Choose your stylist</div>
      <div className="bp-step-sub">
        {buildResultsSummary(
          available.length,
          getService(serviceId).label,
          location,
          dateFrom,
          dateTo,
        )}
      </div>

      <div className="bp-stylist-picker">
        {available.length === 0 ? (
          <div className="bp-no-stylists">
            No stylists found for this style.{" "}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigate(searchPath());
              }}
            >
              Browse all stylists
            </a>
          </div>
        ) : (
          available.map(({ id, name, location }) => (
            <div
              key={id}
              className={cx(
                "bp-stylist-pick-card",
                id === selectedStylistId && "selected",
              )}
              onClick={() => onSelectStylist(id)}
            >
              <div
                className="bp-spc-avatar"
                style={{
                  background:
                    "radial-gradient(ellipse at 45% 35%, #3D1A00, #0D0600, #040200)",
                }}
              />
              <div className="bp-spc-body">
                <div className="bp-spc-name">{name}</div>
                <div className="bp-spc-meta">
                  {location} · from £{60}
                </div>
                <div className="bp-spc-rating">
                  {/* Rounded here, unlike the cards elsewhere which floor. */}
                  <StarRating
                    as="span"
                    className="bp-spc-stars"
                    rating={Math.round(4.9)}
                  />
                  <span className="bp-spc-rc">({3})</span>
                </div>
              </div>
              <div className="bp-spc-avail">Next: {"Thu 10 Jul"}</div>
            </div>
          ))
        )}
      </div>

      <div className="bp-nav-btns">
        <button className="bp-btn-back" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  );
}
