import type { Stylist } from "../types/domain";
import { RESERVED_SLUGS } from "../routes/routes";

// last 1....
// TO DO: HAVE THIS IN DB, THIS IS A PLACEHOLDER FOR NOW
export const STYLISTS: readonly Stylist[] = [
  {
    id: "tiwara",
    slug: "tiwaras-house",
    name: "Tiwara's House",
    city: "Manchester",
    speciality: "Knotless Braids Specialist",
    rating: 4.9,
    reviewCount: 127,
    tags: ["braids", "wigs", "natural-hair", "locs", "treatments"],
    startingPrice: 60,
    nextAvail: "Thu 10 Jul",
    featured: true,
    flagship: true,
    bio: "Tiwara's House is Manchester's premier destination for Afro hair and beauty. Founded on the belief that the Black community deserves better — better access, better transparency, better experiences. No more hunting through group chats for a reliable name. No more travelling hours for a stylist you can trust. World-class braiding, protective styles, wig installs, and treatments — all with effortless online booking and transparent pricing.",
    topServices: [
      { name: "Knotless Braids", price: "from £130", duration: "4–6h" },
      { name: "Wig Installs", price: "from £120", duration: "2–3h" },
      { name: "Fulani Braids", price: "from £110", duration: "3–4h" },
    ],
    catKey: "braids",
    background:
      "radial-gradient(ellipse at 45% 35%, #3D1A00, #0D0600, #040200)",
    reviews: [
      {
        author: "Adaeze O.",
        service: "Knotless Braids",
        rating: 5,
        text: "The most seamless booking experience I've ever had with a braider. Tiwara's work is absolutely immaculate.",
      },
      {
        author: "Simone W.",
        service: "Goddess Locs",
        rating: 5,
        text: "I've been searching for a braider this good for three years. The clarity on pricing alone changed everything.",
      },
      {
        author: "Ngozi A.",
        service: "Box Braids",
        rating: 5,
        text: "Tiwara is a genuine artist. My braids lasted eight weeks. The booking system is brilliant.",
      },
    ],
  },
  {
    id: "amara",
    slug: "amara-beauty",
    name: "Amara Beauty",
    city: "London",
    speciality: "Wig Install & Natural Hair Expert",
    rating: 4.8,
    reviewCount: 89,
    tags: ["wigs", "natural-hair", "treatments"],
    startingPrice: 55,
    nextAvail: "Fri 11 Jul",
    featured: true,
    flagship: false,
    bio: "Amara Beauty is London's go-to studio for flawless wig installs and natural hair care. With over six years of experience working with all textured hair types, Amara brings precision, care, and artistry to every appointment. Every client walks out feeling like the best version of themselves.",
    topServices: [
      { name: "Lace Front Install", price: "from £120", duration: "2–3h" },
      { name: "Full Lace Install", price: "from £150", duration: "2.5–3.5h" },
      { name: "Wash & Style", price: "from £55", duration: "2–3h" },
    ],
    catKey: "wigs",
    background:
      "radial-gradient(ellipse at 45% 35%, #0A2E1A, #041509, #010603)",
    reviews: [
      {
        author: "Kezia M.",
        service: "Lace Front Install",
        rating: 5,
        text: "Absolutely flawless. My hairline looked completely natural — I couldn't believe it.",
      },
      {
        author: "Blessing T.",
        service: "Wash & Style",
        rating: 5,
        text: "Amara really knows textured hair. She took the time to understand my curl pattern and the result was perfect.",
      },
      {
        author: "Ife O.",
        service: "Full Lace Install",
        rating: 4,
        text: "Incredible work, very professional. Will definitely be back.",
      },
    ],
  },
  {
    id: "nia",
    slug: "naturally-nia",
    name: "NaturallyNia",
    city: "Birmingham",
    speciality: "Locs & Protective Styles",
    rating: 4.9,
    reviewCount: 63,
    tags: ["locs", "braids", "natural-hair"],
    startingPrice: 60,
    nextAvail: "Sat 12 Jul",
    featured: true,
    flagship: false,
    bio: "NaturallyNia is Birmingham's most loved loc specialist. Nia has spent eight years perfecting starter locs, Senegalese twists, and protective styles for all curl types — 3A through 4C. Every client leaves feeling seen, celebrated, and beautiful.",
    topServices: [
      { name: "Starter Locs", price: "from £150", duration: "4–7h" },
      { name: "Senegalese Twists", price: "from £110", duration: "3–5h" },
      { name: "Loc Retwist", price: "from £60", duration: "1.5–3h" },
    ],
    catKey: "locs",
    background:
      "radial-gradient(ellipse at 45% 35%, #1A2E10, #080E06, #020402)",
    reviews: [
      {
        author: "Chidinma A.",
        service: "Starter Locs",
        rating: 5,
        text: "Nia is a true artist. My locs are the most even and neat I've ever had — and she finished ahead of schedule.",
      },
      {
        author: "Yemi O.",
        service: "Senegalese Twists",
        rating: 5,
        text: "Came out looking absolutely stunning. Nia is meticulous, so kind, and really listens.",
      },
      {
        author: "Fatima L.",
        service: "Loc Retwist",
        rating: 5,
        text: "The best retwist I've had in years. My locs felt brand new.",
      },
    ],
  },
  {
    id: "zee",
    slug: "styles-by-zee",
    name: "StylesByZee",
    city: "Leeds",
    speciality: "Braids & Colour Specialist",
    rating: 4.7,
    reviewCount: 44,
    tags: ["braids", "wigs"],
    startingPrice: 80,
    nextAvail: "Mon 14 Jul",
    featured: true,
    flagship: false,
    bio: "StylesByZee brings a bold, creative edge to protective styling in Leeds. Zee specialises in braids with colour, intricate patterns, and statement looks. Whether you want classic knotless or something entirely your own, Zee delivers.",
    topServices: [
      { name: "Knotless Braids", price: "from £130", duration: "4–6h" },
      { name: "Fulani Braids", price: "from £110", duration: "3–4h" },
      { name: "Feed-In Braids", price: "from £80", duration: "2–3h" },
    ],
    catKey: "braids",
    background:
      "radial-gradient(ellipse at 45% 35%, #2D1000, #0E0500, #030100)",
    reviews: [
      {
        author: "Zara K.",
        service: "Knotless Braids",
        rating: 5,
        text: "Zee is incredible with colour. My ombre knotless braids were everything I wanted and more!",
      },
      {
        author: "Sade M.",
        service: "Fulani Braids",
        rating: 4,
        text: "Beautiful work — Zee is really fast and the finish is immaculate.",
      },
      {
        author: "Nkechi B.",
        service: "Feed-In Braids",
        rating: 5,
        text: "So happy with how they came out. Will definitely be back.",
      },
    ],
  },
];

export function findStylist(id: string | null): Stylist | undefined {
  if (!id) return undefined;
  return STYLISTS.find((stylist) => stylist.id === id);
}

/**
 * Resolves a profile URL segment. Reserved slugs are rejected outright so a
 * stylist can never shadow one of the app's own paths.
 */
export function findStylistBySlug(
  slug: string | undefined,
): Stylist | undefined {
  if (!slug || RESERVED_SLUGS.has(slug)) return undefined;
  return STYLISTS.find((stylist) => stylist.slug === slug);
}
