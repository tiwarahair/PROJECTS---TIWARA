import type { StatePatch } from "../state";
import type { AccountController } from "../use-account";

export const closeThen = ({ actions }: AccountController, patch: StatePatch) =>
  actions.setState(patch, () => actions.focusLater("returnFocus"));
