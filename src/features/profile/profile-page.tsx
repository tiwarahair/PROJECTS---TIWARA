import { Link, useNavigate } from "react-router";
import { cx } from "../../utils/class-names";
import { StarRating } from "../../components/star-rating";
import { useRouteSurfaces } from "../../hooks/use-route-surfaces";
import { bookingPath, PATH } from "../../routes/routes";
import { BOOKING_STEP } from "../../types/booking";

const PORTFOLIO_TILES = [1, 2, 3, 4, 5, 6];

export function ProfilePage() {
  const navigate = useNavigate();
  const surfaces = useRouteSurfaces();

  // Resolved from the URL slug; undefined whenever the route is not a profile.
  const { stylist } = surfaces;
  const {
    catKey,
    slug,
    name,
    city,
    rating,
    reviewCount,
    speciality,
    background,
    flagship,
    bio,
    topServices = [],
    reviews = [],
    nextAvail,
  } = stylist ?? {};

  function bookThisStylist() {
    if (!stylist) return;
    navigate(
      bookingPath(BOOKING_STEP.style, { service: catKey, stylist: slug }),
    );
  }

  return (
    <div id="profilePage" className="prof-overlay">
      <div className="prof-scroll">
        <div className="prof-hero">
          <div className="prof-hero-bg" style={{ background }} />
          <div className="prof-hero-overlay" />
          <div className="prof-hero-content">
            <span className="prof-badge">
              {flagship ? "✶ Flagship Stylist" : "✶ Verified Stylist"}
            </span>
            <h1 className="prof-name">{name}</h1>
            <div className="prof-location">📍 {city}, UK</div>
            <StarRating className="prof-stars" rating={rating ?? 0}>
              {" "}
              <span>
                {rating} · {reviewCount} reviews
              </span>
            </StarRating>
            <div className="prof-spec">{speciality}</div>
          </div>
        </div>

        <div className="prof-body">
          <div className="prof-section">
            <h3 className="prof-section-title">About</h3>
            <p className="prof-about-text">{bio}</p>
          </div>

          <div className="prof-section">
            <h3 className="prof-section-title">Services &amp; Pricing</h3>
            <div>
              {topServices.map(({ name, duration, price }) => (
                <div key={name} className="prof-svc-row">
                  <div className="prof-svc-info">
                    <div className="prof-svc-name">{name}</div>
                    <div className="prof-svc-dur">{duration}</div>
                  </div>
                  <div className="prof-svc-price">{price}</div>
                  <button className="prof-svc-btn" onClick={bookThisStylist}>
                    Book
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="prof-section">
            <h3 className="prof-section-title">Portfolio</h3>
            <div className="prof-gallery-grid">
              {PORTFOLIO_TILES.map((tile) => (
                <div key={tile} className={cx("prof-gi", `prof-gi-${tile}`)} />
              ))}
            </div>
          </div>

          <div className="prof-section">
            <h3 className="prof-section-title">Reviews</h3>
            <div>
              {reviews.map(({ author, service, text, rating }) => (
                <div key={author} className="prof-review">
                  <div className="prof-review-header">
                    <StarRating
                      as="span"
                      className="prof-review-stars"
                      rating={rating}
                    />
                    <span className="prof-review-author">{author}</span>
                  </div>
                  <div className="prof-review-service">{service}</div>
                  <div className="prof-review-text">“{text}”</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="prof-powered">
        <span className="prof-powered-label">Powered by</span>
        <Link to={PATH.home} className="prof-powered-mark">
          Tiwara&apos;s House<sup>✦</sup>
        </Link>
      </div>

      <div className="prof-footer">
        <div className="prof-footer-info">
          <span className="prof-footer-avail">
            Next available: <strong>{nextAvail}</strong>
          </span>
          <span className="prof-footer-deposit">Deposit from £15</span>
        </div>
        <button className="prof-cta-btn" onClick={bookThisStylist}>
          Book an appointment →
        </button>
      </div>
    </div>
  );
}
