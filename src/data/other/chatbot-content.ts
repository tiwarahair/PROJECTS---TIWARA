import type { ReactNode } from "react";

export type ChatAnswerKey =
  | "book"
  | "price"
  | "deposit"
  | "cancel"
  | "style"
  | "location"
  | "person"
  | "default";

export interface ChatRule {
  pattern: RegExp;
  answer: ChatAnswerKey;
}

// to do: read

/**
 * Matched in order, first hit wins. The order is load-bearing: "how much to
 * cancel" resolves to `price`, not `cancel`, because price is tested first.
 */
export const CHAT_RULES: readonly ChatRule[] = [
  { pattern: /book|appoint|reserv/, answer: "book" },
  { pattern: /price|cost|how much|£|fee/, answer: "price" },
  { pattern: /deposit/, answer: "deposit" },
  { pattern: /cancel|reschedul/, answer: "cancel" },
  { pattern: /style|service|offer|available|do you/, answer: "style" },
  { pattern: /location|area|city|near|where|find/, answer: "location" },
  { pattern: /person|human|agent|talk|speak|real/, answer: "person" },
];

export function matchChatRule(text: string): ChatAnswerKey {
  const lower = text.toLowerCase();
  return (
    CHAT_RULES.find((rule) => rule.pattern.test(lower))?.answer ?? "default"
  );
}

export const WHATSAPP_URL = "https://wa.me/447700000000";
export const CONTACT_EMAIL = "hello@tiwarashouse.com";

/**
 * Plain-text answers. The two that contain links are built as elements in
 * chatbot-answers.tsx instead, because the original injected raw HTML.
 */
export const CHAT_ANSWERS: Readonly<Partial<Record<ChatAnswerKey, string>>> = {
  book: "To book: search for a stylist near you, browse their profile, tap 'Book now'. You'll customise your style, pick a date, add your details, and pay a 25% deposit to confirm. Done in minutes! 💛",
  price:
    "Prices vary by service and stylist. Braids from £60, wig installs from £120, locs from £60, natural hair from £55. You'll always see the full price before you pay — no surprises.",
  deposit:
    "We take a 25% deposit to secure your booking. The balance is paid in the salon on the day. Deposits are non-refundable within 48 hours of your appointment.",
  cancel:
    "You can reschedule up to 48 hours before your appointment using the link in your confirmation email. Cancellations within 48h may forfeit the deposit.",
  style:
    "We offer: Braids & Protective Styles, Wig Installs, Natural Hair Care, Locs & Twists, and Treatments. You can also try our AI Style Discovery — upload an inspo photo and we'll find your look! ✦", //
  location:
    "Tiwara's House has stylists across the UK — Manchester, London, Birmingham, Leeds and more. Use the search bar on the home page to find one near you.",
};

export const GREETING =
  "Hi! 👋 I'm here to help. Ask me about bookings, styles, pricing, or anything else.";

export interface QuickReply {
  /** Text on the button. */
  label: string;
  /** Message actually sent — sometimes longer than the label. */
  message: string;
}

export const QUICK_REPLIES: readonly QuickReply[] = [
  { label: "How do I book?", message: "How do I book?" },
  { label: "What styles?", message: "What styles are available?" },
  { label: "Pricing", message: "How much does it cost?" },
  { label: "Talk to a person", message: "Talk to a person" },
];

export interface ChatMessage {
  id: number;
  author: "bot" | "user";
  body: ReactNode;
}
