import type { ReactNode } from "react";
import { cx } from "../../utils/class-names";
import { useFadeIn } from "../../hooks/use-fade-in";

export type PageHeroTone = "espresso" | "gold" | "forest";

export interface PageHeroProps {
  tone: PageHeroTone;
  eyebrow: string;
  /** Rendered as-is so pages can include <br> and <em>. */
  title: ReactNode;
  subtitle: string;
}

export function PageHero({ tone, eyebrow, title, subtitle }: PageHeroProps) {
  const [heroRef, heroVisible] = useFadeIn<HTMLDivElement>();
  return (
    <div className={cx("pg-hero", `pg-hero--${tone}`)}>
      <div
        className={cx("pg-hero-inner", "fade-in", heroVisible && "visible")}
        ref={heroRef}
      >
        <div className="pg-eyebrow">{eyebrow}</div>
        <h1 className="pg-title">{title}</h1>
        <p className="pg-sub">{subtitle}</p>
      </div>
    </div>
  );
}

export interface PageSectionProps {
  tone?: "cream" | "dark";
  className?: string;
  children: ReactNode;
}

export function PageSection({ tone, className, children }: PageSectionProps) {
  return (
    <div className={cx("pg-section", tone && `pg-section--${tone}`, className)}>
      {children}
    </div>
  );
}

export interface PageValue {
  title: string;
  description: string;
}

export function PageValues({ values }: { values: readonly PageValue[] }) {
  return (
    <div className="pg-values">
      {values.map(({ title, description }) => (
        <div key={title} className="pg-value">
          <div className="pg-value-icon">✶</div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      ))}
    </div>
  );
}

export interface PageStep {
  number: string;
  heading: string;
  body: string;
}

export function PageSteps({ steps }: { steps: readonly PageStep[] }) {
  return (
    <div className="pg-steps">
      {steps.map(({ number, heading, body }) => (
        <div key={number} className="pg-step">
          <div className="pg-step-num">{number}</div>
          <h3>{heading}</h3>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}

export interface PageStat {
  value: string;
  label: string;
}

export function PageStats({ stats }: { stats: readonly PageStat[] }) {
  return (
    <div className="pg-stats">
      {stats.map(({ value, label }) => (
        <div key={label} className="pg-stat">
          <span className="pg-stat-num">{value}</span>
          <span className="pg-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

export interface PageCtaStripProps {
  /** The shop page's strip sits on the cream band. */
  tone?: "cream" | "dark";
  heading: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}

export function PageCtaStrip({
  tone,
  heading,
  body,
  ctaLabel,
  onCta,
}: PageCtaStripProps) {
  return (
    <PageSection tone={tone} className="pg-cta-strip">
      <h2 className="pg-h2">{heading}</h2>
      <p>{body}</p>
      <button className="pg-cta-btn" onClick={onCta}>
        {ctaLabel}
      </button>
    </PageSection>
  );
}
