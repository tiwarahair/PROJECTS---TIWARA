import type { ReactNode } from "react";

const STAR_COUNT = 5;
const FILLED = "★";
const EMPTY = "☆"; // TO DO: USE AN SVG ICON INSTEAD OF A CHARACTER LATER ON

// TO DO: ACTUALLY CALCULATE THE RATING FROM REVIEWS, THIS IS JUST A PLACEHOLDER

export interface StarRatingProps {
  /** Filled stars are counted with Math.floor, so 4.9 shows four. */ // fix that: 4.9 should show 4.5 stars, not 4 stars
  rating: number;
  className?: string;
  /** The original markup uses a span for review stars and a div elsewhere. */
  as?: "div" | "span";
  children?: ReactNode;
}

export function StarRating({
  rating,
  className,
  as: Element = "div",
  children,
}: StarRatingProps) {
  const filled = Math.floor(rating);
  const stars = Array.from({ length: STAR_COUNT }, (_unused, index) =>
    index < filled ? FILLED : EMPTY,
  ).join("");

  return (
    <Element className={className}>
      {stars}
      {children}
    </Element>
  );
}
