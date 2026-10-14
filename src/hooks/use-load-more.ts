import { useEffect, useRef } from "react";

/** Calls loadMore when the returned ref's element comes within 600px of the viewport. */
export const useLoadMore = (loadMore: () => void, isEnabled: boolean) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);

  loadMoreRef.current = loadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !isEnabled || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "600px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [isEnabled]);

  return sentinelRef;
};
