import { Fragment } from "react";
import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";
import { useOverlayActions } from "../../hooks/use-overlay-actions";
import { SERVICE_CARDS } from "../../data/landing-content";

export function ServicesGrid() {
  const [headRef, headVisible] = useFadeIn<HTMLDivElement>();
  const [gridRef, gridVisible] = useFadeIn<HTMLDivElement>();
  const { openSearch, openAiDiscovery } = useOverlayActions();

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
          ({
            number,
            action,
            backgroundClass,
            hint,
            titleLines,
            description,
            cta,
          }) => (
            <div
              key={number}
              className={cx("service-card", action === "ai" && "sc-ai-tile")}
              onClick={() =>
                action === "ai" ? openAiDiscovery() : openSearch(action)
              }
            >
              <div className={cx("sc-bg", backgroundClass)} />
              <div className="sc-open-hint">{hint}</div>
              <div className="service-card-content">
                <span className="sc-num">{number}</span>
                <div className="sc-title">
                  {titleLines.map((line, index) => (
                    <Fragment key={line}>
                      {index > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </div>
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
