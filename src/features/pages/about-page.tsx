import { useAppDispatch } from "../../stores/hooks";
import { pageClosed, searchOpened } from "../../stores/overlays-slice";
import {
  ABOUT_MISSION,
  ABOUT_STATS,
  ABOUT_STEPS,
  ABOUT_VALUES,
} from "../../data/pages-content";
import { PageOverlay } from "./page-overlay";
import {
  PageCtaStrip,
  PageHero,
  PageSection,
  PageStats,
  PageSteps,
  PageValues,
} from "./page-blocks";

export function AboutPage() {
  const dispatch = useAppDispatch();

  return (
    <PageOverlay id="about" domId="aboutPage">
      <PageHero
        tone="espresso"
        eyebrow="Our story"
        title={
          <>
            Art, heritage, and every
            <br />
            strand <em>in between.</em>
          </>
        }
        subtitle="Tiwara's House was built from a simple truth: the Black community deserves better. Better access, better transparency, better experiences."
      />

      <div className="pg-body">
        <PageSection>
          <div className="pg-two-col">
            <div>
              <h2 className="pg-h2">Why we exist</h2>
              <p>
                For too long, finding a skilled, reliable stylist for textured
                hair meant hunting through group chats, Instagram DMs, and word
                of mouth — and even then you couldn&apos;t be sure of pricing,
                availability, or quality until you turned up. Tiwara&apos;s
                House exists to change that.
              </p>
              <p>
                We connect clients with world-class textured hair specialists
                across the UK, offering transparent pricing, verified reviews,
                and an effortless booking experience — all in one place built
                specifically for us.
              </p>
            </div>
            <div className="pg-mission-block">
              <div className="pg-mission-label">Our mission</div>
              <blockquote className="pg-blockquote">{ABOUT_MISSION}</blockquote>
            </div>
          </div>
        </PageSection>

        <PageSection tone="cream">
          <h2 className="pg-h2 pg-h2--centred">What we stand for</h2>
          <PageValues values={ABOUT_VALUES} />
        </PageSection>

        <PageSection>
          <h2 className="pg-h2 pg-h2--centred">How it works</h2>
          <PageSteps steps={ABOUT_STEPS} />
        </PageSection>

        <PageSection tone="dark">
          <PageStats stats={ABOUT_STATS} />
        </PageSection>

        <PageCtaStrip
          heading="Ready to find your stylist?"
          body="Thousands of clients have already booked through Tiwara's House. Join them."
          ctaLabel="Find a stylist near me →"
          onCta={() => {
            dispatch(pageClosed("about"));
            dispatch(searchOpened(""));
          }}
        />
      </div>
    </PageOverlay>
  );
}
