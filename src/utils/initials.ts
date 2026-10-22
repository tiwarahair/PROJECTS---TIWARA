export const getInitials = (name: string | null = "") =>
  name
    ?.trim()
    .split(/\s+/, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "?";
