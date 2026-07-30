import { useState } from "react";
import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { HERO_STATS } from "../../data/landing-content";
import {
  ANY_STYLE_LABEL,
  CHIP_ORDER,
  STYLE_TAXONOMY,
  taxonomyEntry,
} from "../../data/style-taxonomy";
import type { ServiceCategoryKey } from "../../types/domain";

export function HeroSection() {
  const [contentRef, contentVisible] = useFadeIn<HTMLDivElement>();
  const [location, setLocation] = useState("");
  const [style, setStyle] = useState<ServiceCategoryKey | "">("");
  const { openSearch } = useOverlayActions();

  return (
    <section className="hero">
      <div
        ref={contentRef}
        className={cx("hero-content", "fade-in", contentVisible && "visible")}
      >
        <div className="hero-eyebrow">
          The UK&apos;s Premier Textured Hair Platform
        </div>
        <h1>
          Your stylist is
          <br />
          closer than
          <br />
          you <em>think.</em>
        </h1>
        <p className="hero-sub">
          Find and book skilled textured hair specialists near you — transparent
          pricing, instant booking, 25% deposit to confirm.
        </p>

        <div className="hero-search">
          <div className="hs-field">
            <span className="hs-icon">📍</span>
            {/* Never read by the search, exactly as before — the original
                heroSearch() only looked at the style select. */}
            <input
              type="text"
              id="heroLocation"
              className="hs-input"
              placeholder="Your city or postcode"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <div className="hs-sep" />
          <div className="hs-field">
            <span className="hs-icon">✂</span>
            <select
              id="heroStyleSelect"
              className="hs-input"
              value={style}
              onChange={(event) =>
                setStyle(event.target.value as ServiceCategoryKey | "")
              }
            >
              <option value="">{ANY_STYLE_LABEL}</option>
              {STYLE_TAXONOMY.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.selectLabel}
                </option>
              ))}
            </select>
          </div>
          <button className="hs-btn" onClick={() => openSearch(style)}>
            Find stylists
          </button>
        </div>

        <div className="hero-chips">
          {CHIP_ORDER.map((key) => (
            <span
              key={key}
              className="hero-chip"
              onClick={() => openSearch(key)}
            >
              {taxonomyEntry(key)?.chipLabel}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-stats">
        {HERO_STATS.map((stat) => (
          <div key={stat.label}>
            <span className="hero-stat-num">{stat.value}</span>
            <span className="hero-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
      <div className="hero-scroll">Scroll</div>
    </section>
  );
}
