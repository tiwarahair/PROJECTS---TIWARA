type ClassValue = string | false | null | undefined;

/** Joins truthy class names, so `cx("bp-swatch", isSelected && "sel")` reads cleanly in JSX. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
