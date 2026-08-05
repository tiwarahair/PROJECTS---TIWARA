import type { ReactNode } from "react";
import { Header } from "../landing/header";

export interface PageOverlayProps {
  domId: string;
  children: ReactNode;
}

/**
 * Shared chrome for the full pages (About, For Stylists, Shop). These are
 * ordinary pages now: the site nav sits on top, they scroll with the body,
 * and there is nothing to close.
 */
export function PageHeader({ domId, children }: PageOverlayProps) {
  return (
    <div id={domId} className="pg-overlay">
      <Header solid />
      {children}
    </div>
  );
}
