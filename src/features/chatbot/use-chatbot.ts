import { useCallback, useRef, useState } from "react";
import {
  GREETING,
  matchChatRule,
  type ChatMessage,
} from "../../data/chatbot-content";
import { answerFor } from "./chatbot-answers";

/** How long the typing indicator is shown before the reply lands. */
const TYPING_MS = 900;

export interface Chatbot {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  quickRepliesVisible: boolean;
  toggle: () => void;
  send: (text: string) => void;
}

export function useChatbot(): Chatbot {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, author: "bot", body: GREETING },
  ]);
  // A counter rather than a boolean: rapid sends queue several replies, and
  // the indicator should only disappear once the last one has landed.
  const [pendingReplies, setPendingReplies] = useState(0);
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true);
  const nextId = useRef(1);

  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, author: "user", body: trimmed },
    ]);
    setPendingReplies((count) => count + 1);

    setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          author: "bot",
          body: answerFor(matchChatRule(trimmed)),
        },
      ]);
      setPendingReplies((count) => count - 1);
      // Quick replies disappear only once a reply has landed, so they stay
      // visible for the whole typing delay.
      setQuickRepliesVisible(false);
    }, TYPING_MS);
  }, []);

  return {
    isOpen,
    messages,
    isTyping: pendingReplies > 0,
    quickRepliesVisible,
    toggle,
    send,
  };
}
