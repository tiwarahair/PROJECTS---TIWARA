import {
  BlockSheet,
  ClientSheet,
  ClosedSheet,
  NotificationsSheet,
  StripeSheet,
} from "./sheets-simple";
import { SheetFrame } from "./studio-sheet";
import type { StudioController } from "./use-studio";

/** The open sheet's body and footer inside the shared frame (prototype Studio.dc.html lines 1544–3418). */
export const StudioSheets = ({ studio }: { studio: StudioController }) => {
  const { sheet } = studio.state;
  return (
    <SheetFrame studio={studio}>
      {sheet === "notif" && <NotificationsSheet studio={studio} />}
      {sheet === "stripe" && <StripeSheet studio={studio} />}
      {sheet === "block" && <BlockSheet studio={studio} />}
      {sheet === "closed" && <ClosedSheet studio={studio} />}
      {sheet === "client" && <ClientSheet studio={studio} />}
    </SheetFrame>
  );
};
