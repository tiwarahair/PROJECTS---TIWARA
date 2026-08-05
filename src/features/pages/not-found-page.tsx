import { useNavigate } from "react-router";
import { searchPath } from "../../routes/routes";
import { Header } from "../landing/header";
import { PageCtaStrip, PageHero, PageSection } from "./page-blocks";

/**
 * Reached by any path that matches no route, and by a single-segment path that
 * is not a stylist — a mistyped profile link should explain itself rather than
 * silently landing on the homepage.
 *
 * Built only from the existing page blocks so it needs no CSS of its own.
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div id="notFoundPage" className="pg-overlay">
      <Header solid />

      <PageHero
        tone="espresso"
        eyebrow="404"
        title={
          <>
            We couldn&apos;t find
            <br />
            <em>that page.</em>
          </>
        }
        subtitle="The link may be out of date, or the stylist you're looking for may have moved."
      />

      <div className="pg-body">
        <PageSection>
          <div className="pg-two-col">
            <div>
              <h2 className="pg-h2">Where next?</h2>
              <p>
                If you followed a link to a stylist, their page may have been
                renamed since it was shared. Browsing all stylists is the
                quickest way to find them again.
              </p>
            </div>
            <div className="pg-mission-block">
              <div className="pg-mission-label">Still here for you</div>
              <blockquote className="pg-blockquote">
                Every stylist on the platform is verified, with transparent
                pricing and real reviews.
              </blockquote>
            </div>
          </div>
        </PageSection>

        <PageCtaStrip
          tone="cream"
          heading="Let's find your stylist."
          body="Browse verified textured hair specialists across the UK."
          ctaLabel="Find a stylist →"
          onCta={() => navigate(searchPath())}
        />
      </div>
    </div>
  );
}
