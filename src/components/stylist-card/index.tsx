import { ChevronRight, Heart, MapPin, Star } from "lucide-react";
import { VerifiedBadgeIcon } from "../icons/custom-icons";
import { ResponsiveImage, preloadImage } from "../responsive-image";
import { PROFILE_COVER_SIZES } from "../../utils/image-sources";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router";
import { api } from "../../stores/api-slice";
import { useFavourites } from "../../hooks/use-favourites";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/stylist-card/index.module.css";

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
          <Heart
            size={20}
            strokeWidth={2}
            fill={isSaved ? "var(--accent-700)" : "none"}
            color={isSaved ? "#fffefb" : "currentColor"}
          />
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
              <VerifiedBadgeIcon size={15} className={styles.verified} />
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
            <MapPin className={styles.areaIcon} size={14} strokeWidth={1.8} />
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
                  <ChevronRight
                    className={styles.chevron}
                    size={15}
                    strokeWidth={1.5}
                  />
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
