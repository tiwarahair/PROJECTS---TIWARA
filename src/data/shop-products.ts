export type ShopCategory = "hair" | "care" | "accessories";
export type ShopFilter = ShopCategory | "all";

export interface ShopProduct {
  id: string;
  category: ShopCategory;
  title: string;
  subtitle: string;
  price: string;
  badge?: string;
  /** The "Best seller" badge uses the gold variant. */
  badgeGold?: boolean;
  /** Gradient artwork class, for products that have one. */
  imageClass?: string;
  /** Emoji stand-in for products with no artwork yet. */
  placeholder?: string;
  swatches: string[];
}

export const SHOP_FILTERS: readonly { id: ShopFilter; label: string }[] = [
  { id: "all", label: "All products" },
  { id: "hair", label: "Extension Hair" },
  { id: "care", label: "Hair Care" },
  { id: "accessories", label: "Accessories" },
];

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  {
    id: "boho-deep-wave",
    category: "hair",
    title: "Pre-Sectioned Boho Deep Wave",
    subtitle: "Bulk braiding hair — 7 lengths available",
    price: "£18.99",
    badge: "New",
    imageClass: "si-1",
    swatches: ["#1a1108", "#3d2000", "#7a3800", "#c07020", "#e8d080"],
  },
  {
    id: "kanekalon",
    category: "hair",
    title: "Pre-Sectioned Kanekalon Braiding",
    subtitle: "Standard braiding hair — 5 lengths available",
    price: "£14.99",
    badge: "Best seller",
    badgeGold: true,
    imageClass: "si-2",
    swatches: ["#1a1108", "#3d2000", "#8B3A00", "#c07020"],
  },
  {
    id: "french-curl",
    category: "hair",
    title: "Pre-Sectioned French Curl",
    subtitle: "Curl braiding hair — 4 lengths available",
    price: "£16.99",
    imageClass: "si-3",
    swatches: ["#1a1108", "#3d2000", "#c07020"],
  },
  {
    id: "accessories-kit",
    category: "accessories",
    title: "Hair Care Accessories Kit",
    subtitle: "Combs, edge tools, scalp oils",
    price: "from £6.99",
    imageClass: "si-4",
    swatches: [],
  },
  {
    id: "deep-conditioning-mask",
    category: "care",
    title: "Deep Conditioning Mask",
    subtitle: "Intensive moisture treatment — all curl types",
    price: "£12.99",
    placeholder: "🧴",
    swatches: [],
  },
  {
    id: "leave-in-conditioner",
    category: "care",
    title: "Lightweight Leave-In Conditioner",
    subtitle: "Daily moisture & detangling spray",
    price: "£9.99",
    placeholder: "💧",
    swatches: [],
  },
  {
    id: "scalp-oil",
    category: "care",
    title: "Scalp Nourishing Oil",
    subtitle: "Castor & jojoba blend — stimulates growth",
    price: "£11.99",
    placeholder: "🌿",
    swatches: [],
  },
  {
    id: "satin-bonnet",
    category: "accessories",
    title: "Satin-Lined Bonnet",
    subtitle: "Protects styles overnight — one size",
    price: "£8.99",
    placeholder: "✨",
    swatches: ["#1a1108", "#8F1112", "#1C3829"],
  },
];

/** "all" shows everything; otherwise match the product's category. */
export function filterProducts(
  products: readonly ShopProduct[],
  filter: ShopFilter,
): ShopProduct[] {
  return products.filter(
    (product) => filter === "all" || product.category === filter,
  );
}
