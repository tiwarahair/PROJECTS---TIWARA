import { StarRating } from "../../components/star-rating";
import type { Stylist } from "../../types/domain";

export interface StylistCardProps {
  stylist: Stylist;
  onOpenProfile: (stylistId: string) => void;
  onBook: (stylist: Stylist) => void;
}

export function StylistCard({
  stylist: {
    id,
    name,
    city,
    rating,
    reviewCount,
    speciality,
    startingPrice,
    flagship,
    topServices,
    background,
  },
  stylist,
  onOpenProfile,
  onBook,
}: StylistCardProps) {
  // TO DO: Consider showing more than two services, or a "more" link that opens the profile.
  // Only the first two services are listed, as in the original.
  const services = topServices
    .slice(0, 2)
    .map(({ name }) => name)
    .join(" · ");

  return (
    <div className="sr-card" onClick={() => onOpenProfile(id)}>
      <div className="sr-card-img" style={{ background }}>
        {flagship && <div className="sr-flagship-badge">✶ Flagship</div>}
      </div>
      <div className="sr-card-body">
        <div className="sr-card-top">
          <div>
            <div className="sr-card-name">{name}</div>
            <div className="sr-card-city">📍 {city}</div>
          </div>
          <div className="sr-card-rating-block">
            <StarRating className="sr-star-row" rating={rating} />
            <div className="sr-rating-num">
              {rating} ({reviewCount})
            </div>
          </div>
        </div>
        <div className="sr-card-spec">{speciality}</div>
        <div className="sr-card-svcs">{services}</div>
        <div className="sr-card-footer">
          <span className="sr-card-price">from £{startingPrice}</span>
          <div className="sr-card-btns">
            <button
              className="sr-btn-view"
              onClick={(event) => {
                event.stopPropagation();
                onOpenProfile(id);
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
