import type { SavedCard } from "../types/saved-card";
import { invokeFunction } from "./invoke-function";

interface CardRow {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  is_default: boolean;
}

const toCards = ({ cards }: { cards: CardRow[] }): SavedCard[] =>
  cards.map(({ is_default: isDefault, ...card }) => ({ ...card, isDefault }));

const callCards = (body: object) =>
  invokeFunction<{ cards: CardRow[] }>("client-cards", body).then(toCards);

export const fetchClientCards = () => callCards({ action: "list" });

export const startCardSetup = () =>
  invokeFunction<{ clientSecret: string }>("client-cards", {
    action: "setup",
  }).then(({ clientSecret }) => clientSecret);

export const setDefaultCard = (card: string) =>
  callCards({ action: "default", card });

export const removeClientCard = (card: string) =>
  callCards({ action: "remove", card });
