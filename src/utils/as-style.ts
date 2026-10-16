import type { CSSProperties } from "react";

export const asStyle = (values: Record<string, string | null | undefined>) =>
  values as CSSProperties;
