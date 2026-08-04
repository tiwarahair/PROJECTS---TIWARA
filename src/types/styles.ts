// === styles ===
export interface StyleConfig {
  name: "Length" | "Colour" | "Hair Texture" | "Size" | "Add-ons";
  options:
    ColourOption[] | LengthOption[] | string[] | SizeOption[] | AddOnOption[];
}

// Length
export type Length = "Bob" | "Shoulder" | "Bra length" | "Waist length / bum";

export type LengthValue = '10"-12"' | '14"-18"' | '20"-24"' | '26"+';

export interface LengthOption {
  name: Length;
  inches: LengthValue;
}

// Colour
export type ColourId = "1" | "1B" | "30" | "4/33" | "613" | "other";

export interface ColourOption {
  name: string;
  value: ColourId;
  hex: string;
}

export interface Colour {
  name: string;
  options: ColourOption[];
}

// Size

export type BraidSize = "Small" | "Medium" | "Large";

export interface SizeOption {
  name: BraidSize;
  description: string;
  recommended?: boolean;
  badge?: string;
  strandCount?: number;
  strandWidth?: number;
}

// Add-ons
export interface AddOnOption {
  id:
    | "beads"
    | "boho"
    | "burnt-ends"
    | "blow-dry"
    | "scalp-analysis"
    | "other"
    | "layers"
    | "curls";
  name: string;
  addedCost?: number;
  serviceIds: string[];
  pending?: boolean;
}
