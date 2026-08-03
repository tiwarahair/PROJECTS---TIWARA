import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { SERVICE_CARDS } from "../../data/other/landing-content";

export function ServicesGrid() {
  const [headRef, headVisible] = useFadeIn<HTMLDivElement>();
  const [gridRef, gridVisible] = useFadeIn<HTMLDivElement>();
  const { openBooking, openAiDiscovery } = useOverlayActions();

  const numbers = ["01", "02", "03", "04", "05", "✦ AI"];
  const backgroundClasses = [
    "sc-bg-1",
    "sc-bg-2",
    "sc-bg-3",
    "sc-bg-4",
    "sc-bg-5",
    "sc-bg-6",
  ];

  return (
    <section className="services" id="services">
      <div
        ref={headRef}
        className={cx("section-head", "fade-in", headVisible && "visible")}
      >
        <span className="section-label">Browse by style</span>
        <h2>Six ways to find your look.</h2>
      </div>
      <div
        ref={gridRef}
        className={cx("services-grid", "fade-in", gridVisible && "visible")}
      >
        {SERVICE_CARDS.map(
          ({ action, hint, title, description, cta }, index) => (
            <div
              key={numbers[index]}
              className={cx("service-card", action === "ai" && "sc-ai-tile")}
              // A style card starts a booking directly rather than dropping
              // the user into search first.
              onClick={() =>
                action === "ai" ? openAiDiscovery() : openBooking(action)
              }
            >
              <div className={cx("sc-bg", backgroundClasses[index])} />
              <div className="sc-open-hint">{hint}</div>
              <div className="service-card-content">
                <span className="sc-num">{numbers[index]}</span>
                <div className="sc-title">{title}</div>
                <div className="sc-desc">{description}</div>
                <span className="sc-cta">{cta}</span>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
