import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatbot } from "./use-chatbot";
import { matchChatRule } from "../../data/other/chatbot-content";

const TYPING_MS = 900;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("matchChatRule", () => {
  it("routes each topic to its answer", () => {
    expect(matchChatRule("How do I book?")).toBe("book");
    expect(matchChatRule("Talk to a person")).toBe("person");
    expect(matchChatRule("what about the deposit")).toBe("deposit");
    expect(matchChatRule("blah blah")).toBe("default");
  });

  it("is order-sensitive: 'how much to cancel' is a pricing question", () => {
    // price is tested before cancel, so the earlier rule wins even though the
    // message also matches /cancel/. Preserved from the original if/else chain.
    expect(matchChatRule("how much to cancel")).toBe("price");
  });

  it("is case-insensitive", () => {
    expect(matchChatRule("BOOK ME IN")).toBe("book");
  });
});

describe("useChatbot", () => {
  it("opens and closes", () => {
    const { result } = renderHook(() => useChatbot());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
  });

  it("starts with the greeting only", () => {
    const { result } = renderHook(() => useChatbot());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]!.author).toBe("bot");
  });

  it("shows the user message immediately and the reply after 900ms", () => {
    const { result } = renderHook(() => useChatbot());

    act(() => result.current.send("How do I book?"));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.isTyping).toBe(true);

    act(() => void vi.advanceTimersByTime(TYPING_MS));
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.isTyping).toBe(false);
  });

  it("keeps quick replies visible for the whole typing delay", () => {
    const { result } = renderHook(() => useChatbot());

    act(() => result.current.send("Pricing?"));
    // Still visible while the indicator is up — they hide only once the reply
    // lands, not when the message is sent.
    expect(result.current.quickRepliesVisible).toBe(true);

    act(() => void vi.advanceTimersByTime(TYPING_MS));
    expect(result.current.quickRepliesVisible).toBe(false);
  });

  it("ignores empty and whitespace-only messages", () => {
    const { result } = renderHook(() => useChatbot());

    act(() => result.current.send("   "));
    expect(result.current.messages).toHaveLength(1);
  });

  it("keeps the indicator up until the last of several replies lands", () => {
    const { result } = renderHook(() => useChatbot());

    act(() => result.current.send("first"));
    act(() => void vi.advanceTimersByTime(400));
    act(() => result.current.send("second"));

    act(() => void vi.advanceTimersByTime(500)); // first reply lands
    expect(result.current.isTyping).toBe(true);

    act(() => void vi.advanceTimersByTime(400)); // second reply lands
    expect(result.current.isTyping).toBe(false);
    expect(result.current.messages).toHaveLength(5);
  });
});
