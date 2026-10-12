/** [label, £ delta, minutes delta] */
type CustomisationSeed = [string, number, number];

interface PlatformCustomisationSet {
  size: CustomisationSeed[];
  length: CustomisationSeed[];
}

export type PlatformCustomisations = Record<
  "braids" | "locs",
  PlatformCustomisationSet
>;
