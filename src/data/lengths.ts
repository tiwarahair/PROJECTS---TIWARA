export const DEFAULT_LENGTH_INDEX = 1;

/** Full labels used in the summary and the preview caption. */
export const LENGTHS: readonly string[] = [
  'Bob (10–12")',
  'Shoulder (14–18")',
  'Bra Length (20–24")',
  'Waist / Bum (26"+)',
];

/** The length picker splits each label into a name and a measurement. */
export interface LengthOption {
  name: string;
  inches: string;
}

export const LENGTH_OPTIONS: readonly LengthOption[] = [
  { name: "Bob", inches: '10–12"' },
  { name: "Shoulder", inches: '14–18"' },
  { name: "Bra Length", inches: '20–24"' },
  { name: "Waist / Bum", inches: '26"+' },
];

export function lengthLabel(index: number): string {
  return LENGTHS[index] ?? LENGTHS[DEFAULT_LENGTH_INDEX]!;
}
