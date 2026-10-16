import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

export const getPaneClass = (studio: StudioController) =>
  joinClassNames(shared.pane, studio.state.bookingStepOut && shared.paneOut);
