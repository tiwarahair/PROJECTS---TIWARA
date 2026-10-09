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
  fixShare: boolean;
}

const readInitialParams = (): InitialParams => {
  const params = getSearchParams();
  return {
    id: params.get("stylist") || DEFAULT_STYLIST_ID,
    sticky: params.get("sticky") === "1",
    fixShare: params.get("share") === "open",
  };
};

/** Popover sits 8px under the button, right-aligned to it, at least 12px from the viewport edge. */
const getSharePosition = (element: Element): SharePosition => {
  const { bottom, right } = element.getBoundingClientRect();
  return {
    top: Math.round(bottom + 8) + "px",
    right: Math.max(12, Math.round(window.innerWidth - right)) + "px",
  };
};

/** State, window listeners and the lightbox for Stylist Profile (prototype Component state + componentDidMount). */
export const useStylistProfile = () => {
  // read once: StrictMode re-runs effects, and the URL is not rewritten here
  const [initial] = useState(readInitialParams);
  const [zoomList, setZoomList] = useState<string[]>([]);
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const [svcModal, setSvcModal] = useState<ServiceModal | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareAt, setShareAt] = useState<SharePosition | null>(null);
  const [sticky, setSticky] = useState(initial.sticky);
  const [covOn, setCovOn] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const openZoom = useCallback((list: string[], index: number) => {
    setZoomList(list);
    setZoomIdx(Math.max(0, index));
  }, []);

  const stepZoom = useCallback(
    (delta: number) => {
      const { length } = zoomList;
      setZoomIdx((index) =>
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
    if (!initial.fixShare)
      window.addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close);
    };
  }, [initial.fixShare]);

  // ?share=open opens the popover from the cover's Share button after the entrance animation
  useEffect(() => {
    if (!initial.fixShare) return;
    const timer = window.setTimeout(() => {
      if (shareButtonRef.current) openShare(shareButtonRef.current);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [initial.fixShare, openShare]);

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
    if (zoomIdx == null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") stepZoom(1);
      else if (event.key === "ArrowLeft") stepZoom(-1);
      else if (event.key === "Escape") setZoomIdx(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomIdx, stepZoom]);

  const zoomSrc = zoomIdx != null ? (zoomList[zoomIdx] ?? null) : null;

  return {
    id: initial.id,
    heroRef,
    shareButtonRef,
    menuOpen,
    toggleMenu: () => setMenuOpen((open) => !open),
    covOn: covOn || !!shareAt,
    toggleCov: () => setCovOn((on) => !on),
    sticky,
    shareAt,
    openShare,
    closeShare: () => setShareAt(null),
    svcModal,
    openSvcModal: setSvcModal,
    closeSvcModal: () => setSvcModal(null),
    openZoom,
    zoom: {
      src: zoomSrc,
      counter: zoomIdx != null ? zoomIdx + 1 + " / " + zoomList.length : "",
      close: () => setZoomIdx(null),
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
