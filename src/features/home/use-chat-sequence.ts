import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { chatMessages } from "../../data";

interface ChatSequence {
  shown: number;
  isTyping: boolean;
  isBooked: boolean;
}

/**
 * Plays the "booking back-and-forth" chat once the phone scrolls into view, then loops.
 * Always full motion: the reduced-motion toggle was removed.
 */
export const useChatSequence = (
  phoneRef: RefObject<HTMLElement | null>,
  listRef: RefObject<HTMLElement | null>,
): ChatSequence => {
  const [sequence, setSequence] = useState<ChatSequence>({
    shown: 0,
    isTyping: false,
    isBooked: false,
  });

  const update = (patch: Partial<ChatSequence>) =>
    setSequence((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const phone = phoneRef.current;

    if (!phone || !chatMessages.length) return;

    let isPlaying = false;
    let timers: number[] = [];

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const play = () => {
      isPlaying = true;
      clearTimers();

      const at = (delay: number, callback: () => void) =>
        timers.push(window.setTimeout(callback, delay));

      update({ shown: 0, isTyping: false, isBooked: false });
      let time = 500;

      chatMessages.forEach(({ from, text }, index) => {
        if (from === "stylist") {
          at(time, () => update({ isTyping: true }));
          time += 1150;
          at(time, () => update({ isTyping: false, shown: index + 1 }));
        } else at(time, () => update({ shown: index + 1 }));

        time += text.length * 13 + 500;
      });

      at(time + 400, () => update({ isBooked: true }));

      at(time + 5200, () => {
        isPlaying = false;
        play();
      });
    };

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ isIntersecting }) => {
          if (isIntersecting && !isPlaying) play();
        }),
      {
        threshold: 0,
        rootMargin: window.matchMedia("(max-width:760px)").matches
          ? "0px 0px 20% 0px"
          : "0px 0px -6% 0px",
      },
    );

    observer.observe(phone);

    // fallback: some environments never fire IO — poll the rect instead
    const watch = window.setInterval(() => {
      if (isPlaying) {
        window.clearInterval(watch);

        return;
      }

      const rect = phone.getBoundingClientRect();

      if (rect.top < window.innerHeight * 1.05 && rect.bottom > 0) {
        window.clearInterval(watch);
        play();
      }
    }, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(watch);
      clearTimers();
    };
  }, [phoneRef]);

  // keep the newest message in view
  useLayoutEffect(() => {
    const list = listRef.current;

    if (list && list.scrollHeight > list.clientHeight)
      list.scrollTop = list.scrollHeight;
  }, [listRef, sequence]);

  return sequence;
};
