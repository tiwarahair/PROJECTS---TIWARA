import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { Link, useNavigate } from "react-router";
import { PATH, profilePath } from "../../routes/routes";
import { StarRating } from "../../components/star-rating";
import { getSpecialty, STYLISTS } from "../../data/stylist/stylist";

const background =
  "radial-gradient(ellipse at 45% 35%, #3D1A00, #0D0600, #040200)";

export function FeaturedStylists() {
  const [headerRef, headerVisible] = useFadeIn<HTMLDivElement>();
  const navigate = useNavigate();
  const featured = STYLISTS.slice(0, 3); // for now

  return (
    <section className="feat-stylists">
      <div className="feat-stylists-inner">
        <div
          ref={headerRef}
          className={cx("fs-header", "fade-in", headerVisible && "visible")}
        >
          <div>
            <span className="section-label">Featured stylists</span>
            <h2 className="fs-heading">Top rated on the platform</h2>
          </div>
          <Link to={PATH.search} className="fs-see-all">
            See all stylists →
          </Link>
        </div>
        <div className="fs-track" id="fsTrack">
          {featured.map(({ id, slug, name, location, specialityIds }) => (
            <div
              key={id}
              className="fs-card"
              onClick={() => navigate(profilePath(slug))}
            >
              <div className="fs-card-img" style={{ background }}>
                {slug === "tiwaras-house" && (
                  <div className="fs-flagship">✶ Flagship</div>
                )}
              </div>
              <div className="fs-card-body">
                <div className="fs-card-name">{name}</div>
                <div className="fs-card-city">📍 {location}</div>
                <div className="fs-card-spec">
                  {getSpecialty(specialityIds)}
                </div>
                <StarRating className="fs-card-rating" rating={4.9}>
                  {" "}
                  <span>{4.9}</span>
                </StarRating>
                <div className="fs-card-footer">
                  <span className="fs-card-price">from £{60}</span>
                  <button
                    className="fs-card-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(profilePath(slug));
                    }}
                  >
                    View profile →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
