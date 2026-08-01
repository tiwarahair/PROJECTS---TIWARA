import type { ServiceCategory, ServiceCategoryKey } from "../types/domain";

export const DEFAULT_SERVICE_KEY: ServiceCategoryKey = "braids";

// is this the only place where this data lives? (defined sub-categories / individual services)
/* services & individual services per service */
export const SERVICES: Readonly<Record<ServiceCategoryKey, ServiceCategory>> = {
  braids: {
    key: "braids",
    name: "Braids & Protective Styles",
    hasSize: true,
    hasLength: true,
    styles: [
      {
        id: "knotless",
        name: "Knotless Braids",
        price: "from £130",
        base: 130,
        duration: "4–6h",
        background:
          "radial-gradient(ellipse at 50% 25%, #4A2200, #1A0A00, #060301)",
      },
      {
        id: "fulani",
        name: "Fulani Braids",
        price: "from £110",
        base: 110,
        duration: "3–4h",
        background:
          "radial-gradient(ellipse at 50% 25%, #2A1800, #0E0700, #030201)",
      },
      {
        id: "cornrows",
        name: "Cornrows",
        price: "from £60",
        base: 60,
        duration: "1.5–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #1A3020, #081509, #020604)",
      },
      {
        id: "feedin",
        name: "Feed-In Braids",
        price: "from £80",
        base: 80,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #381A00, #140800, #040201)",
      },
      {
        id: "stitch",
        name: "Stitch Braids",
        price: "from £90",
        base: 90,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #2A1200, #0E0600, #030200)",
      },
    ],
  },
  wigs: {
    key: "wigs",
    name: "Wig Installs",
    hasSize: false,
    hasLength: true,
    styles: [
      {
        id: "lacefront",
        name: "Lace Front Install",
        price: "from £120",
        base: 120,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #0A2820, #041408, #010603)",
      },
      {
        id: "fulllace",
        name: "Full Lace Install",
        price: "from £150",
        base: 150,
        duration: "2.5–3.5h",
        background:
          "radial-gradient(ellipse at 50% 25%, #0D3025, #050F09, #010503)",
      },
      {
        id: "360",
        name: "360 Wig Install",
        price: "from £140",
        base: 140,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #1A3020, #080E09, #020403)",
      },
      {
        id: "custom",
        name: "Wig Customisation",
        price: "from £80",
        base: 80,
        duration: "1.5–2.5h",
        background:
          "radial-gradient(ellipse at 50% 25%, #101D18, #06100A, #020503)",
      },
    ],
  },
  natural: {
    key: "natural",
    name: "Natural Hair Care",
    hasSize: false,
    hasLength: true,
    styles: [
      {
        id: "washstyle",
        name: "Wash & Style",
        price: "from £55",
        base: 55,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #3A2808, #140E03, #040301)",
      },
      {
        id: "blowout",
        name: "Blowout",
        price: "from £65",
        base: 65,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #4A3010, #1A1005, #050301)",
      },
      {
        id: "twistout",
        name: "Twist Out",
        price: "from £70",
        base: 70,
        duration: "2–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #2A1808, #0E0803, #030201)",
      },
      {
        id: "silkpress",
        name: "Silk Press",
        price: "from £85",
        base: 85,
        duration: "3–4h",
        background:
          "radial-gradient(ellipse at 50% 25%, #3A2000, #150C00, #040200)",
      },
    ],
  },
  locs: {
    key: "locs",
    name: "Locs & Twists",
    hasSize: true,
    hasLength: true,
    styles: [
      {
        id: "starterlocs",
        name: "Starter Locs",
        price: "from £150",
        base: 150,
        duration: "4–7h",
        background:
          "radial-gradient(ellipse at 50% 25%, #1A2A10, #080E06, #020402)",
      },
      {
        id: "twostrand",
        name: "Two-Strand Twists",
        price: "from £90",
        base: 90,
        duration: "3–5h",
        background:
          "radial-gradient(ellipse at 50% 25%, #2A1808, #100800, #030200)",
      },
      {
        id: "senegalese",
        name: "Senegalese Twists",
        price: "from £110",
        base: 110,
        duration: "3–5h",
        background:
          "radial-gradient(ellipse at 50% 25%, #3A2010, #150C04, #040201)",
      },
      {
        id: "marley",
        name: "Marley Twists",
        price: "from £120",
        base: 120,
        duration: "4–6h",
        background:
          "radial-gradient(ellipse at 50% 25%, #281808, #0E0A03, #030200)",
      },
      {
        id: "retwist",
        name: "Loc Retwist",
        price: "from £60",
        base: 60,
        duration: "1.5–3h",
        background:
          "radial-gradient(ellipse at 50% 25%, #141E0C, #080B05, #020301)",
      },
    ],
  },
  treatments: {
    key: "treatments",
    name: "Treatments",
    hasSize: false,
    hasLength: false,
    styles: [
      {
        id: "deepcond",
        name: "Deep Conditioning",
        price: "from £45",
        base: 45,
        duration: "1–1.5h",
        background:
          "radial-gradient(ellipse at 50% 25%, #1A1808, #0A0A04, #030302)",
      },
      {
        id: "scalp",
        name: "Scalp Treatment",
        price: "from £35",
        base: 35,
        duration: "45min",
        background:
          "radial-gradient(ellipse at 50% 25%, #1A2010, #0A0E08, #020402)",
      },
      {
        id: "protein",
        name: "Protein Treatment",
        price: "from £55",
        base: 55,
        duration: "1.5–2h",
        background:
          "radial-gradient(ellipse at 50% 25%, #2A1808, #100A04, #030200)",
      },
      {
        id: "hotoil",
        name: "Hot Oil Treatment",
        price: "from £30",
        base: 30,
        duration: "45min",
        background:
          "radial-gradient(ellipse at 50% 25%, #1A1408, #0A0804, #020200)",
      },
    ],
  },
};

export function getService(key: ServiceCategoryKey): ServiceCategory {
  return SERVICES[key] || SERVICES[DEFAULT_SERVICE_KEY];
}

export function getIndividualService(
  key: ServiceCategoryKey,
  styleId: string | null,
) {
  if (!styleId) return undefined;
  return SERVICES[key].styles.find((style) => style.id === styleId);
}
