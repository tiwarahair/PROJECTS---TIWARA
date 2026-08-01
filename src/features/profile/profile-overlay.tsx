import { useEffect, useMemo, useRef } from "react";
import { cx } from "../../utils/class-names";
import { StarRating } from "../../components/star-rating";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { bookingOpened, profileClosed } from "../../stores/overlays-slice";
import { findStylist } from "../../data/stylists";
import type { ServiceCategoryKey } from "../../types/domain";

const PORTFOLIO_TILES = [1, 2, 3, 4, 5, 6];

export function ProfileOverlay() {
  const dispatch = useAppDispatch();
  const {
    overlay: { profile },
    activeStylistId,
  } = useAppSelector((state) => state.overlays);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stylist = useMemo(
    () => findStylist(activeStylistId),
    [activeStylistId],
  );

  const {
    catKey,
    id,
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
  } = stylist || {};

  // The panel scrolls back to the top each time a profile is opened.
  useEffect(() => {
    if (profile && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [profile, activeStylistId]);

  function bookThisStylist() {
    if (!stylist) return;
    dispatch(
      bookingOpened({
        categoryKey: catKey as ServiceCategoryKey,
        stylistId: id,
        stylistName: name,
      }),
    );
  }

  return (
    <div id="profilePage" className={cx("prof-overlay", profile && "open")}>
      <div className="prof-nav">
        <button className="prof-back" onClick={() => dispatch(profileClosed())}>
          Back to stylists
        </button>
        <button className="prof-book-top" onClick={bookThisStylist}>
          Book now
        </button>
      </div>

      <div className="prof-scroll" ref={scrollRef}>
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
