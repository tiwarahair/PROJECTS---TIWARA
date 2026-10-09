/** [label, £ delta, minutes delta] */
export type CustomisationSeed = [string, number, number];

export interface PlatformCustomisationSet {
  size: CustomisationSeed[];
  length: CustomisationSeed[];
}

export type PlatformCustomisations = Record<
  "braids" | "locs",
  PlatformCustomisationSet
>;
