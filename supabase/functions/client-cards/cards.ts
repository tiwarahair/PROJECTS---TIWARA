export interface CardRow {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  is_default: boolean;
}

interface CardMethod {
  id: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

const BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  diners: "Diners",
  jcb: "JCB",
  unionpay: "UnionPay",
};

/** A customer with cards but no default (cards kept at checkout) uses its first card. */
export const toCardRows = (methods: CardMethod[], defaultId: string | null): CardRow[] => {
  const cards = methods.flatMap(({ id, card }) => (card ? [{ id, card }] : []));
  const shownDefault = defaultId ?? cards[0]?.id;

  return cards.map(({ id, card: { brand, last4, exp_month, exp_year } }) => ({
    id,
    brand: BRANDS[brand] ?? "Card",
    last4,
    expiry: `${String(exp_month).padStart(2, "0")}/${String(exp_year).slice(-2)}`,
    is_default: id === shownDefault,
  }));
};
