import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { SHOP_CARDS } from "../../data/landing-content";

export function ShopSection() {
  const [introRef, introVisible] = useFadeIn<HTMLDivElement>();
  const [gridRef, gridVisible] = useFadeIn<HTMLDivElement>();
  const [promptRef, promptVisible] = useFadeIn<HTMLDivElement>();
  const { openSearch } = useOverlayActions();

  return (
    <section className="shop" id="shop">
      <div
        ref={introRef}
        className={cx("shop-intro", "fade-in", introVisible && "visible")}
      >
        <span className="section-label">Tiwara&apos;s House Shop</span>
        <h2>The same hair we use in the salon</h2>
        <p>
          Premium pre-sectioned extension hair — every portion perfectly
          measured. No untangling bundles, no guessing how much you need.
        </p>
      </div>
      <div
        ref={gridRef}
        className={cx("shop-grid", "fade-in", gridVisible && "visible")}
      >
        {SHOP_CARDS.map(
          ({ title, subtitle, imageClass, badge, swatches, price }) => (
            <div key={title} className="shop-card">
              <div className="shop-card-img">
                <div className={cx("shop-card-img-inner", imageClass)} />
                {badge && <div className="shop-card-badge">{badge}</div>}
              </div>
              <div className="shop-card-body">
                <div className="shop-card-title">{title}</div>
                <div className="shop-card-sub">{subtitle}</div>
                <div className="shop-card-swatches">
                  {swatches.map((colour) => (
                    <div
                      key={colour}
                      className="s-swatch"
                      style={{ background: colour }}
                    />
                  ))}
                </div>
                <div className="shop-card-footer">
                  <span className="shop-card-price">{price}</span>
                  <a href="#" className="shop-card-cta">
                    Shop now →
                  </a>
                </div>
              </div>
            </div>
          ),
        )}
      </div>
      <div
        ref={promptRef}
        className={cx(
          "shop-book-prompt",
          "fade-in",
          promptVisible && "visible",
        )}
      >
        <div className="sbp-text">
          <h3>Buying hair for your appointment?</h3>
          <p>
            Add to basket and collect at the salon, or have it delivered before
            your date.
          </p>
        </div>
        <a
          href="#"
          className="btn-outline-light"
          onClick={(event) => {
            event.preventDefault();
            openSearch("");
          }}
        >
          Find your stylist →
        </a>
      </div>
    </section>
  );
}
