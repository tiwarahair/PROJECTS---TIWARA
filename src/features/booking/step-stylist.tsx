import { cx } from "../../utils/class-names";
import { useAppDispatch } from "../../stores/hooks";
import { bookingClosed, searchOpened } from "../../stores/overlays-slice";
import { STYLISTS } from "../../data/stylists";
import { getService } from "../../data/service-categories";
import { filterStylists, stylistCountLabel } from "../../utils/filter-stylists";
import { StarRating } from "../../components/star-rating";
import type { ServiceCategoryKey } from "../../types/domain";

export interface StepStylistProps {
  serviceCategoryKey: ServiceCategoryKey;
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
  serviceCategoryKey,
  location,
  dateFrom,
  dateTo,
  selectedStylistId,
  onSelectStylist,
  onBack,
}: StepStylistProps) {
  const dispatch = useAppDispatch();
  const available = filterStylists(STYLISTS, {
    style: serviceCategoryKey,
    location,
  });

  return (
    <>
      <div className="bp-step-title">Choose your stylist</div>
      <div className="bp-step-sub">
        {buildResultsSummary(
          available.length,
          getService(serviceCategoryKey).name,
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
                dispatch(bookingClosed());
                dispatch(searchOpened(""));
              }}
            >
              Browse all stylists
            </a>
          </div>
        ) : (
          available.map(
            ({
              id,
              name,
              city,
              startingPrice,
              rating,
              reviewCount,
              nextAvail,
              background,
            }) => (
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
                  style={{ background: background }}
                />
                <div className="bp-spc-body">
                  <div className="bp-spc-name">{name}</div>
                  <div className="bp-spc-meta">
                    {city} · from £{startingPrice}
                  </div>
                  <div className="bp-spc-rating">
                    {/* Rounded here, unlike the cards elsewhere which floor. */}
                    <StarRating
                      as="span"
                      className="bp-spc-stars"
                      rating={Math.round(rating)}
                    />
                    <span className="bp-spc-rc">({reviewCount})</span>
                  </div>
                </div>
                <div className="bp-spc-avail">Next: {nextAvail}</div>
              </div>
            ),
          )
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
