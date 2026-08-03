import type { ReactNode } from "react";
import {
  CHAT_ANSWERS,
  CONTACT_EMAIL,
  WHATSAPP_URL,
  type ChatAnswerKey,
} from "../../data/other/chatbot-content";

const LINK_STYLE = { color: "var(--orange)" };

export function answerFor(key: ChatAnswerKey): ReactNode {
  if (key === "person") {
    return (
      <>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          style={LINK_STYLE}
        >
          Chat on WhatsApp →
        </a>{" "}
        or email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>
          {CONTACT_EMAIL}
        </a>
        . We aim to reply within 2 hours. 💛
      </>
    );
  }

  if (key === "default") {
    return (
      <>
        Great question! For anything I can&apos;t answer, connect with the team:{" "}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          style={LINK_STYLE}
        >
          WhatsApp
        </a>{" "}
        or{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={LINK_STYLE}>
          email us
        </a>
        .
      </>
    );
  }

  return CHAT_ANSWERS[key];
}
