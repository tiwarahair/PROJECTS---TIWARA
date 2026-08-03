import { useEffect, useRef, useState } from "react";
import { cx } from "../../utils/class-names";
import { QUICK_REPLIES } from "../../data/other/chatbot-content";
import { useChatbot } from "./use-chatbot";

// to do: check this / rework
// read through all chatbot stuff, not read yet
// leave till last last lastttt

/** The input is focused after the open transition has run. */
const FOCUS_DELAY_MS = 280;

export function ChatbotWidget() {
  const { isOpen, messages, isTyping, quickRepliesVisible, send, toggle } =
    useChatbot();
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, isTyping]);

  function submitDraft() {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
  }

  return (
    <>
      <button
        className="chatbot-toggle"
        onClick={toggle}
        title="Chat with us"
        aria-label="Open chat"
      >
        💬
      </button>
      <div
        className={cx("chatbot-window", isOpen && "open")}
        role="dialog"
        aria-label="Chat with Tiwara's House"
      >
        <div className="chatbot-head">
          <div>
            <div className="chatbot-head-name">Tiwara&apos;s House</div>
            <div className="chatbot-head-sub">Usually replies instantly</div>
          </div>
          <button
            className="chatbot-close"
            onClick={toggle}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        <div className="chatbot-body" ref={bodyRef}>
          {messages.map(({ id, body, author }) => (
            <div key={id} className={cx("cb-msg", author)}>
              {body}
            </div>
          ))}
          {isTyping && (
            <div className="cb-msg bot" style={{ opacity: 0.5 }}>
              …
            </div>
          )}
        </div>

        {quickRepliesVisible && (
          <div className="chatbot-quick-replies">
            {QUICK_REPLIES.map(({ label, message }) => (
              <button
                key={label}
                className="cb-qr"
                onClick={() => send(message)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="chatbot-input-row">
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder="Type a message…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitDraft();
            }}
          />
          <button
            className="chatbot-send"
            onClick={submitDraft}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
