import { Star } from "lucide-react";
import {
  ResponsiveImage,
  preloadImage,
} from "../responsive-image/responsive-image";
import { PROFILE_COVER_SIZES } from "../../utils/image-sources";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router";
import { api } from "../../stores/api-slice";
import { useFavourites } from "../../hooks/use-favourites";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/stylist-card/stylist-card.module.css";

interface StylistCardRow {
  name: string;
  meta: string;
  href: string;
}

interface StylistCardFact {
  text: string;
  strong?: boolean;
}

/** A service shown on the card: a plain name, or a service object (only active ones are listed). */
type StylistCardService = string | { name: string; status?: string };

export interface StylistCardProps {
  href?: string;
  cover?: string;
  stylistName?: string;
  rating?: string | number;
  reviews?: string | number;
  area?: string;
  /** "From" price: a number (£ added) or a string already starting with £. */
  from?: number | string | null;
  verified?: boolean;
  /** Overrides the computed "services · from £X" line on the right of the area. */
  meta?: string;
  rows?: StylistCardRow[];
  facts?: StylistCardFact[];
  services?: StylistCardService[];
  stylistId?: string;
  bookHref?: string;
  /** Above the fold (the first search results): load the cover straight away. */
  priority?: boolean;
}

interface CardLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  /** Router state for the page it opens (the profile's preview). */
  state?: unknown;
  /** Hover, focus or touch: the visitor is about to open it. */
  onIntent?: () => void;
}

const COVER_SIZES = "(max-width: 700px) 90vw, 460px";

/** Internal routes use the router; "#" and anything else stay plain anchors. */
const CardLink = ({
  href,
  className,
  children,
  state,
  onIntent,
}: CardLinkProps) =>
  href.startsWith("/") ? (
    <Link
      to={href}
      state={state}
      className={className}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
    >
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );

const getMeta = (
  services: StylistCardService[],
  from: StylistCardProps["from"],
) => {
  const serviceNames = services
    .filter(
      (service) => typeof service === "string" || service.status === "active",
    )
    .slice(0, 2)
    .map((service) => (typeof service === "string" ? service : service.name));

  const fromText =
    from != null ? `from ${String(from)[0] === "£" ? from : `£${from}`}` : null;

  return [...serviceNames, fromText].filter(Boolean).join(" · ");
};

/** Photo-led stylist card with a favourite heart, used by Home, Search and Account. */
export const StylistCard = ({
  href = "#",
  cover = "",
  stylistName = "",
  rating = "",
  reviews = "",
  area = "",
  from,
  verified = false,
  meta,
  rows = [],
  facts = [],
  services = [],
  stylistId,
  bookHref = "",
  priority = false,
}: StylistCardProps) => {
  const { isFavourite, toggleFavourite } = useFavourites();

  // profile links are "/{slug}"
  const id = stylistId || String(href).split(/[/?]/)[1] || "";

  const prefetchProfile = api.usePrefetch("getStylistProfile");
  const slug = href.startsWith("/") ? (href.split(/[/?#]/)[1] ?? "") : "";
  const profileState = { preview: { name: stylistName, area, cover } };

  // the profile's data and cover start loading before the click
  const handleIntent = () => {
    if (!slug) return;

    prefetchProfile(slug, { ifOlderThan: 60 });

    if (cover) preloadImage(cover, PROFILE_COVER_SIZES);
  };

  const isSaved = !!id && isFavourite(id);
  const metaText = meta ?? getMeta(services, from);

  const handleHeart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (id) toggleFavourite(id, event);
  };

  return (
    // plain block wrapper: the card's height:100% resolves against it (auto)
    <div data-dc-host="">
      <div className={styles.card}>
        <CardLink
          href={href}
          className={styles.coverLink}
          state={profileState}
          onIntent={handleIntent}
        >
          {/* stycover / rescover: Home and Search style the cover from outside */}
          {cover ? (
            <ResponsiveImage
              hasShimmer
              className={joinClassNames("stycover rescover", styles.cover)}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              src={cover}
              sizes={COVER_SIZES}
              alt={stylistName}
            />
          ) : (
            <span
              role="img"
              aria-label={stylistName}
              className={joinClassNames(
                "stycover rescover",
                styles.cover,
                styles.coverPlaceholder,
              )}
            />
          )}
        </CardLink>
        <button
          type="button"
          className={joinClassNames("sc-heart", styles.heart)}
          aria-label={
            (isSaved ? "Remove " : "Save ") +
            stylistName +
            (isSaved ? " from favourites" : " to favourites")
          }
          aria-pressed={isSaved ? "true" : "false"}
          onClick={handleHeart}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isSaved ? "var(--accent-700)" : "none"}
            stroke={isSaved ? "#fffefb" : "currentColor"}
            strokeWidth="2"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"></path>
          </svg>
        </button>
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <CardLink
              href={href}
              className={styles.name}
              state={profileState}
              onIntent={handleIntent}
            >
              {stylistName}
            </CardLink>
            {verified && (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="var(--accent-700)"
              >
                <path d="M12 2l2.4 2.1 3.1-.4 1 3 2.9 1.2-.6 3.1L23 12l-2.2 2.3.6 3.1-2.9 1.2-1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1-3-2.9-1.2.6-3.1L1 12l2.2-2.3-.6-3.1 2.9-1.2 1-3 3.1.4z"></path>
                <path
                  d="M9.5 12.2l1.8 1.8 3.6-3.8"
                  stroke="#fffefb"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            )}
            <span className={styles.rating}>
              <Star size={14} strokeWidth={0} fill="var(--brand-yellow)" />
              {reviews ? (
                <>
                  {rating}{" "}
                  <span className={styles.reviewCount}>({reviews})</span>
                </>
              ) : (
                "New"
              )}
            </span>
          </div>
          <div className={styles.areaRow}>
            <svg
              className={styles.areaIcon}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span className={styles.area}>{area}</span>
            {!rows.length && <span className={styles.meta}>{metaText}</span>}
          </div>
          {facts.length > 0 && (
            <div className={styles.facts}>
              {facts.map(({ text, strong }, index) => (
                <span
                  key={`f${index}`}
                  className={strong ? styles.factStrong : styles.fact}
                >
                  {text}
                </span>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <div className={styles.rows}>
              {rows.map(({ name, meta: rowMeta, href: rowHref }, index) => (
                <CardLink
                  key={`r${index}`}
                  href={rowHref}
                  className={styles.row}
                >
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{name}</span>
                    <span className={styles.rowMeta}>{rowMeta}</span>
                  </span>
                  <svg
                    className={styles.chevron}
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 5 7 7-7 7"></path>
                  </svg>
                </CardLink>
              ))}
            </div>
          )}
          {bookHref && (
            <CardLink href={bookHref} className={styles.book}>
              Book
            </CardLink>
          )}
        </div>
      </div>
    </div>
  );
};
