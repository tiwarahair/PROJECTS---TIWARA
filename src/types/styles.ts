// === styles ===
export interface StyleConfig {
  name: "Length" | "Colour" | "Hair Texture" | "Size" | "Add-ons";
  options:
    | ColourOption[]
    | LengthOption[]
    | HairTextureOption[]
    | SizeOption[]
    | AddOnOption[];
}

// Length
export type Length = "Bob" | "Shoulder" | "Bra length" | "Waist / bum";

export type LengthId = "bob" | "shoulder" | "bra" | "waist";

export type LengthInches = '10"-12"' | '14"-18"' | '20"-24"' | '26"+';

export interface LengthOption {
  name: Length;
  value: LengthId;
  inches: LengthInches;
}

// Hair texture — only Wig Installs collects this.
export type HairTextureId =
  | "straight"
  | "body-wave"
  | "burmese-curly"
  | "yaki-straight"
  | "water-wave"
  | "deep-wave"
  | "kinky-curly"
  | "kinky-straight";

export interface HairTextureOption {
  name: string;
  value: HairTextureId;
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
  addedCostPence?: number;
  serviceIds: string[];
  pending?: boolean;
}
