import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { GALLERY_ITEMS } from "../../data/landing-content";

export function IndividualServicesGrid() {
  const [headRef, headVisible] = useFadeIn<HTMLDivElement>();
  const [gridRef, gridVisible] = useFadeIn<HTMLDivElement>();
  const { openSearch } = useOverlayActions();

  return (
    <section className="featured">
      <div
        ref={headRef}
        className={cx("section-head", "fade-in", headVisible && "visible")}
      >
        <span className="section-label">The work</span>
        <h2>Featured styles</h2>
      </div>
      {/* `.gallery-item:nth-child(1..5)` sets the grid spans, so these must
          stay direct children with nothing wrapping them. */}
      <div
        ref={gridRef}
        className={cx("gallery-grid", "fade-in", gridVisible && "visible")}
      >
        {GALLERY_ITEMS.map((item) => (
          <div
            key={item.label}
            className={cx("gallery-item", item.backgroundClass)}
            onClick={() => openSearch(item.filter)}
          >
            <span className="gi-label">{item.label}</span>
            <span className="gi-cta">Find stylists →</span>
          </div>
        ))}
      </div>
    </section>
  );
}
