export const DEFAULT_LENGTH_INDEX = 1;

/* Full labels used in the summary and the preview caption. */
export const LENGTHS: readonly string[] = [
  'Short (10–12")',
  'Medium (14–18")',
  'Long (20–24")',
  'XL (26–30")',
];

/* The length picker splits each label into a name and a measurement. */
export interface LengthOption {
  name: string;
  inches: string;
}

export const LENGTH_OPTIONS: readonly LengthOption[] = [
  { name: "Short", inches: '10–12"' },
  { name: "Medium", inches: '14–18"' },
  { name: "Long", inches: '20–24"' },
  { name: "XL", inches: '26–30"' },
];

export function lengthLabel(index: number): string {
  return LENGTHS[index] ?? LENGTHS[DEFAULT_LENGTH_INDEX]!;
}
