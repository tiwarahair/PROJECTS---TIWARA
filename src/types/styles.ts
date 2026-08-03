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
  name: string;
  addedCost?: number;
  serviceIds: string[];
  pending?: boolean;
}
