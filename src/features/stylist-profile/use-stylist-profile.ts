import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import { getSearchParams } from "../../utils/page-flags";
import { DEFAULT_STYLIST_ID } from "./profile-logic";
import type { ServiceModal } from "./profile-logic";

export interface SharePosition {
  top: string;
  right: string;
}

interface InitialParams {
  id: string;
  sticky: boolean;
  shareFixture: boolean;
}

const readInitialParams = (): InitialParams => {
  const params = getSearchParams();

  return {
    id: params.get("stylist") || DEFAULT_STYLIST_ID,
    sticky: params.get("sticky") === "1",
    shareFixture: params.get("share") === "open",
  };
};

/** Popover sits 8px under the button, right-aligned to it, at least 12px from the viewport edge. */
const getSharePosition = (element: Element): SharePosition => {
  const { bottom, right } = element.getBoundingClientRect();

  return {
    top: `${Math.round(bottom + 8)}px`,
    right: `${Math.max(12, Math.round(window.innerWidth - right))}px`,
  };
};

/** State, window listeners and the lightbox for Stylist Profile. */
export const useStylistProfile = () => {
  // read once: StrictMode re-runs effects, and the URL is not rewritten here
  const [initial] = useState(readInitialParams);
  const [zoomList, setZoomList] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [serviceModal, setServiceModal] = useState<ServiceModal | null>(null);
  const [shareAt, setShareAt] = useState<SharePosition | null>(null);
  const [sticky, setSticky] = useState(initial.sticky);
  const [coverActionsOn, setCoverActionsOn] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const openZoom = useCallback((list: string[], index: number) => {
    setZoomList(list);
    setZoomIndex(Math.max(0, index));
  }, []);

  const stepZoom = useCallback(
    (delta: number) => {
      const { length } = zoomList;

      setZoomIndex((index) =>
        index == null || !length ? index : (index + delta + length) % length,
      );
    },
    [zoomList],
  );

  const openShare = useCallback((element: Element) => {
    setShareAt(getSharePosition(element));
  }, []);

  // share popover: any click, Escape or (unless pinned by ?share=open) a scroll closes it
  useEffect(() => {
    const close = () => setShareAt(null);

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("click", close);
    window.addEventListener("keydown", handleKey);

    if (!initial.shareFixture)
      window.addEventListener("scroll", close, { passive: true });

    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close);
    };
  }, [initial.shareFixture]);

  // ?share=open opens the popover from the cover's Share button after the entrance animation
  useEffect(() => {
    if (!initial.shareFixture) return;

    const timer = window.setTimeout(() => {
      if (shareButtonRef.current) openShare(shareButtonRef.current);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [initial.shareFixture, openShare]);

  // mobile sticky bar once the hero scrolls away (?sticky=1 pins it on)
  useEffect(() => {
    const hero = heroRef.current;

    if (!hero || !window.IntersectionObserver || initial.sticky) return;

    const observer = new IntersectionObserver((entries) => {
      setSticky(!entries[0]?.isIntersecting && window.innerWidth <= 720);
    });

    observer.observe(hero);

    return () => observer.disconnect();
  }, [initial.sticky]);

  // lightbox keys
  useEffect(() => {
    if (zoomIndex == null) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") stepZoom(1);
      else if (event.key === "ArrowLeft") stepZoom(-1);
      else if (event.key === "Escape") setZoomIndex(null);
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomIndex, stepZoom]);

  const zoomSrc = zoomIndex != null ? (zoomList[zoomIndex] ?? null) : null;

  return {
    id: initial.id,
    heroRef,
    shareButtonRef,
    coverActionsOn: coverActionsOn || !!shareAt,
    toggleCoverActions: () => setCoverActionsOn((on) => !on),
    sticky,
    shareAt,
    openShare,
    closeShare: () => setShareAt(null),
    serviceModal,
    openServiceModal: setServiceModal,
    closeServiceModal: () => setServiceModal(null),
    openZoom,
    zoom: {
      src: zoomSrc,
      counter: zoomIndex != null ? `${zoomIndex + 1} / ${zoomList.length}` : "",
      close: () => setZoomIndex(null),
      prev: (event: MouseEvent) => {
        event.stopPropagation();
        stepZoom(-1);
      },
      next: (event: MouseEvent) => {
        event.stopPropagation();
        stepZoom(1);
      },
      touchStart: (event: TouchEvent) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      },
      touchEnd: (event: TouchEvent) => {
        const endX = event.changedTouches[0]?.clientX;

        if (touchStartX.current == null || endX == null) return;

        const deltaX = endX - touchStartX.current;

        touchStartX.current = null;

        // a swipe longer than 44px steps the photo
        if (Math.abs(deltaX) > 44) stepZoom(deltaX < 0 ? 1 : -1);
      },
    },
  };
};

export type StylistProfileController = ReturnType<typeof useStylistProfile>;
