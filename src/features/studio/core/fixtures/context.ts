import type { ServiceActions } from "../../services/actions";
import type { StudioActions, StudioContext } from "../actions";
import type { StudioService, StudioState, TwoFactorDevice } from "../types";

export interface FixtureContext {
  key: string;
  context: StudioContext;
  actions: StudioActions;
  serviceActions: ServiceActions;
  state: StudioState;
  main: TwoFactorDevice[];
  both: TwoFactorDevice[];
  drafts: StudioService[];
  stripeDone: StudioState["check"];
  setBase: (patch: Partial<StudioState>) => void;
  toServices: () => void;
  knotless: () => StudioService | undefined;
}

export type FixtureSetup = (fixture: FixtureContext) => void;

export type FixtureTable = Record<string, FixtureSetup>;

export const withServices = (
  { toServices }: FixtureContext,
  run: () => void,
) => {
  toServices();
  window.setTimeout(run, 60);
};
