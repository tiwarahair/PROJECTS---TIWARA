interface CheckIconProps {
  className?: string;
}

/** 14px tick used in selected chips and options. */
export const CheckIcon = ({ className }: CheckIconProps) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5"></path>
  </svg>
);

/** 14px chevron used on the filter and sort buttons. */
export const ChevronIcon = ({ className }: CheckIconProps) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6"></path>
  </svg>
);
