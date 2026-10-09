/** Joins the truthy class names: joinClassNames(styles.base, isOpen && styles.open). */
export const joinClassNames = (
  ...classNames: (string | false | null | undefined)[]
): string => classNames.filter(Boolean).join(" ");
