import { useState } from "react";
import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { Link, useNavigate } from "react-router";
import { PATH, searchPath } from "../../routes/routes";
import { HERO_CHIPS } from "../../data/other/landing-content";
import type { ServiceId } from "../../types/services";
import { SERVICES } from "../../data/services/services";
import heroImage from "../../assets/hero/hero.jpeg";

export function HeroSection() {
  const [contentRef, contentVisible] = useFadeIn<HTMLDivElement>();
  const [location, setLocation] = useState("");
  const [style, setStyle] = useState<ServiceId | "">("");
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div
        className="hero-photo-bg"
        style={{
          backgroundImage: `url('${heroImage}')`,
        }}
      />
      <div className="hero-overlay" />

      <div
        ref={contentRef}
        className={cx("hero-content", "fade-in", contentVisible && "visible")}
      >
        <div className="hero-eyebrow">The UK&apos;s Home of Textured Hair</div>
        <h1>
          Your stylist is closer
          <br />
          than you <em>think.</em>
        </h1>

        {/* Wide centred search: style first, then location. */}
        <div className="hero-search hero-search--wide">
          <div className="hs-field">
            <span className="hs-icon">✂</span>
            <select
              id="heroStyleSelect"
              className="hs-input"
              aria-label="Style"
              value={style}
              onChange={(event) =>
                setStyle(event.target.value as ServiceId | "")
              }
            >
              <option value="">What are you looking for?</option>
              {SERVICES.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="hs-sep" />
          <div className="hs-field">
            <span className="hs-icon">📍</span>
            {/* Still never read by the search, exactly as before. */}
            <input
              type="text"
              id="heroLocation"
              className="hs-input"
              placeholder="City or postcode"
              aria-label="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          {/* `location` is still never read by the search, exactly as before. */}
          <button
            className="hs-btn"
            onClick={() => navigate(searchPath({ style }))}
          >
            Search
          </button>
        </div>

        <div className="hero-chips">
          {HERO_CHIPS.map(({ label, filter }) => (
            <Link
              key={label}
              className="hero-chip"
              to={
                filter === "quiz"
                  ? PATH.hairQuiz
                  : searchPath({ style: filter })
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
