import { AppShellFooterNav } from "../../../components/app-shell";
import type { StudioController } from "../core/use-studio";
import { getNavItems } from "./nav-items";

export const FooterNav = ({ studio }: { studio: StudioController }) => (
  <AppShellFooterNav label="Studio" items={getNavItems(studio)} />
);
