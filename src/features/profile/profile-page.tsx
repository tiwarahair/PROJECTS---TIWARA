import { Link, useNavigate } from "react-router";
import { cx } from "../../utils/class-names";
import { StarRating } from "../../components/star-rating";
import { useRouteSurfaces } from "../../hooks/use-route-surfaces";
import { bookingPath, PATH } from "../../routes/routes";
import { BOOKING_STEP, firstUnansweredStep } from "../../types/booking";
import { getSpecialty, getStylistStyles } from "../../data/stylist/stylist";
import { isCustomisable } from "../../data/services/services";
import type { ServiceId } from "../../types/services";

const PORTFOLIO_TILES = [1, 2, 3, 4, 5, 6];

// temp
const reviews = [
  {
    author: "Adaeze O.",
    service: "Knotless Braids",
    rating: 5,
    text: "The most seamless booking experience I've ever had with a braider. Tiwara's work is absolutely immaculate.",
  },
  {
    author: "Simone W.",
    service: "Goddess Locs",
    rating: 5,
    text: "I've been searching for a braider this good for three years. The clarity on pricing alone changed everything.",
  },
  {
    author: "Ngozi A.",
    service: "Box Braids",
    rating: 5,
    text: "Tiwara is a genuine artist. My braids lasted eight weeks. The booking system is brilliant.",
  },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const surfaces = useRouteSurfaces();

  // Resolved from the URL slug; undefined whenever the route is not a profile.
  const { stylist } = surfaces;
  const { slug, name, location, specialityIds, description } = stylist ?? {};

  // temp
  const rating = 4.9;
  const reviewCount = 3;
  const background =
    "radial-gradient(ellipse at 45% 35%, #3D1A00, #0D0600, #040200)";
  const flagship = slug === "tiwaras-house";
  // No stylist means no rows. getStylistStyles(null) is the whole catalogue,
  // which is right for the booking flow but wrong for a storefront.
  const topServices = stylist ? getStylistStyles(stylist.id).slice(0, 3) : [];
  const nextAvail = "Sat 12 Jul";

  // const top3ServiceIds = Object.keys(services).slice(0,3)

  // for (const serviceId of top3ServiceIds) {
  //   topServices.push({
  //     name:
  //   })
  // }

  // TO DO: Consider showing more than two services, or a "more" link that opens the profile.
  // // Only the first two services are listed, as in the original.
  // const services = topServices
  //   .slice(0, 2)
  //   .map(({ name }) => name)
  //   .join(" · ");

  const speciality = getSpecialty(specialityIds ?? []);

  /** The main CTA settles only the stylist, so the service is still to pick. */
  function bookThisStylist() {
    if (!stylist) return;
    navigate(bookingPath(BOOKING_STEP.service, { stylist: slug }));
  }

  /**
   * A service row settles the service and the style too, so the booking opens
   * at whatever it has left to ask.
   */
  function bookStyle(serviceId: ServiceId, styleId: string) {
    if (!stylist) return;
    const step = firstUnansweredStep({
      serviceId,
      styleId,
      stylistId: stylist.id,
      customisable: isCustomisable(serviceId),
    });
    navigate(
      bookingPath(step, { service: serviceId, style: styleId, stylist: slug }),
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
            <div className="prof-location">📍 {location}, UK</div>
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
            <p className="prof-about-text">{description}</p>
          </div>

          <div className="prof-section">
            <h3 className="prof-section-title">Services &amp; Pricing</h3>
            <div>
              {topServices.map(
                ({ serviceId, styleId, label, duration, price }) => (
                  <div key={styleId} className="prof-svc-row">
                    <div className="prof-svc-info">
                      <div className="prof-svc-name">{label}</div>
                      <div className="prof-svc-dur">{duration}</div>
                    </div>
                    <div className="prof-svc-price">from £{price}</div>
                    <button
                      className="prof-svc-btn"
                      onClick={() => bookStyle(serviceId, styleId)}
                    >
                      Book
                    </button>
                  </div>
                ),
              )}
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
