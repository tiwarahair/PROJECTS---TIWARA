import { useState } from "react";
import { useNavigate } from "react-router";
import { searchPath } from "../../routes/routes";
import { cx } from "../../utils/class-names";
import {
  SHOP_FILTERS,
  SHOP_PRODUCTS,
  filterProducts,
  type ShopFilter,
} from "../../data/other/shop-products";
import { PageHeader } from "./page-header";
import { PageCtaStrip, PageHero, PageSection } from "./page-blocks";

export function ShopPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ShopFilter>("all");
  const products = filterProducts(SHOP_PRODUCTS, filter);

  return (
    <PageHeader domId="shopPage">
      <PageHero
        tone="forest"
        eyebrow="Tiwara's House Shop"
        title={
          <>
            The same hair we use
            <br />
            in the salon.
          </>
        }
        subtitle="Premium pre-sectioned extension hair — every portion perfectly measured. No untangling bundles, no guessing how much you need."
      />

      <div className="pg-body">
        <PageSection>
          <div className="pg-shop-filter">
            {SHOP_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                className={cx("pg-filter-btn", id === filter && "active")}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filtering removes cards rather than hiding them with a style
              attribute, which is what the vanilla version did. */}
          <div className="pg-shop-grid">
            {products.map(
              ({
                id,
                imageClass,
                placeholder,
                badge,
                badgeGold,
                title,
                subtitle,
                swatches,
                price,
              }) => (
                <div key={id} className="pg-shop-card">
                  <div
                    className={cx(
                      "pg-shop-img",
                      placeholder && "pg-shop-img--plain",
                    )}
                  >
                    {imageClass && (
                      <div className={cx("shop-card-img-inner", imageClass)} />
                    )}
                    {placeholder && (
                      <div className="pg-shop-img-placeholder">
                        {placeholder}
                      </div>
                    )}
                    {badge && (
                      <div
                        className={cx(
                          "pg-shop-badge",
                          badgeGold && "pg-shop-badge--gold",
                        )}
                      >
                        {badge}
                      </div>
                    )}
                  </div>
                  <div className="pg-shop-body">
                    <div className="pg-shop-title">{title}</div>
                    <div className="pg-shop-sub">{subtitle}</div>
                    <div className="pg-shop-swatches">
                      {swatches.map((colour) => (
                        <div
                          key={colour}
                          className="s-swatch"
                          style={{ background: colour }}
                        />
                      ))}
                    </div>
                    <div className="pg-shop-footer">
                      <span className="pg-shop-price">{price}</span>
                      <button className="pg-shop-cta">Add to bag</button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </PageSection>

        <PageCtaStrip
          tone="cream"
          heading="Buying hair for your appointment?"
          body="Order now and collect at the salon, or have it delivered before your date."
          ctaLabel="Book an appointment →"
          onCta={() => navigate(searchPath())}
        />
      </div>
    </PageHeader>
  );
}
