interface ArrowIconProps {
  className?: string;
  strokeWidth?: string;
  /** Hero / tile arrows round their joins; the problem CTA's does not. */
  roundJoin?: boolean;
}

/** The → used by Home's CTAs (two paths, 16px). */
export const ArrowIcon = ({
  className,
  strokeWidth = "2",
  roundJoin = true,
}: ArrowIconProps) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin={roundJoin ? "round" : undefined}
  >
    <path d="M5 12h14"></path>
    <path d="m13 6 6 6-6 6"></path>
  </svg>
);
