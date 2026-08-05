import { StarRating } from "../../components/star-rating";
import { getService } from "../../data/services/services";
import { getSpecialty } from "../../data/stylist/stylist";
import type { ServiceId } from "../../types/services";
import type { Stylist } from "../../types/stylist";

export interface StylistCardProps {
  stylist: Stylist;
  onOpenProfile: (stylistSlug: string) => void;
  onBook: (stylist: Stylist) => void;
}

const background =
  "radial-gradient(ellipse at 45% 35%, #3D1A00, #0D0600, #040200)";

export function StylistCard({
  stylist: { slug, name, location, services, specialityIds },
  stylist,
  onOpenProfile,
  onBook,
}: StylistCardProps) {
  // hard coded for now:
  const rating = 4.9;
  const reviewCount = 3;
  const startingPrice = 60;
  const flagship = slug === "tiwaras-house";
  const speciality = getSpecialty(specialityIds);
  const servicesList = Object.keys(services)
    .map((id) => getService(id as ServiceId)?.label)
    .slice(0, 2)
    .join(" · ");

  return (
    <div className="sr-card" onClick={() => onOpenProfile(slug)}>
      <div className="sr-card-img" style={{ background }}>
        {flagship && <div className="sr-flagship-badge">✶ Flagship</div>}
      </div>
      <div className="sr-card-body">
        <div className="sr-card-top">
          <div>
            <div className="sr-card-name">{name}</div>
            <div className="sr-card-city">📍 {location}</div>
          </div>
          <div className="sr-card-rating-block">
            <StarRating className="sr-star-row" rating={rating} />
            <div className="sr-rating-num">
              {rating} ({reviewCount})
            </div>
          </div>
        </div>
        <div className="sr-card-spec">{speciality}</div>
        <div className="sr-card-svcs">{servicesList}</div>
        <div className="sr-card-footer">
          <span className="sr-card-price">from £{startingPrice}</span>
          <div className="sr-card-btns">
            <button
              className="sr-btn-view"
              onClick={(event) => {
                event.stopPropagation();
                onOpenProfile(slug);
              }}
            >
              View profile
            </button>
            <button
              className="sr-btn-book"
              onClick={(event) => {
                event.stopPropagation();
                onBook(stylist);
              }}
            >
              Book now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
