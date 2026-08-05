import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { Link, useNavigate } from "react-router";
import { PATH, profilePath } from "../../routes/routes";
import { StarRating } from "../../components/star-rating";
import { STYLISTS } from "../../data/stylists";

export function FeaturedStylists() {
  const [headerRef, headerVisible] = useFadeIn<HTMLDivElement>();
  const navigate = useNavigate();
  const featured = STYLISTS.filter(({ featured }) => featured);

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
          {featured.map(
            ({
              id,
              slug,
              background,
              flagship,
              name,
              city,
              speciality,
              rating,
              startingPrice,
            }) => (
              <div
                key={id}
                className="fs-card"
                onClick={() => navigate(profilePath(slug))}
              >
                <div className="fs-card-img" style={{ background }}>
                  {flagship && <div className="fs-flagship">✶ Flagship</div>}
                </div>
                <div className="fs-card-body">
                  <div className="fs-card-name">{name}</div>
                  <div className="fs-card-city">📍 {city}</div>
                  <div className="fs-card-spec">{speciality}</div>
                  <StarRating className="fs-card-rating" rating={rating}>
                    {" "}
                    <span>{rating}</span>
                  </StarRating>
                  <div className="fs-card-footer">
                    <span className="fs-card-price">from £{startingPrice}</span>
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
            ),
          )}
        </div>
      </div>
    </section>
  );
}
