import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useEntered } from "../../hooks/use-entered";
import { closeLoginSheet } from "../../stores/favourites-slice";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { getScreenPath } from "../../features/onboarding/onboarding-routes";
import { writeSession } from "../../utils/page-flags";

import styles from "../../styles/components/fav-login-sheet/fav-login-sheet.module.css";

const EXIT_MS = 230;

interface LoginSheetCardProps {
  stylistId: string;
}

const LoginSheetCard = ({ stylistId }: LoginSheetCardProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const entered = useEntered();
  const [closing, setClosing] = useState(false);
  const [isMobile] = useState(() => window.innerWidth <= 640);
  const loginRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);

  useEffect(() => {
    if (entered) loginRef.current?.focus();
  }, [entered]);

  useEffect(() => {
    if (closing) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setClosing(true);
    };

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [closing]);

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(() => {
      dispatch(closeLoginSheet());
      previousFocus.current?.focus?.();
    }, EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [closing, dispatch]);

  // after log in the stylist is saved and the guest lands back on this page with login=1
  const goToOnboarding = (screen: string) => {
    let returnTo = (pathname + search)
      .replace(/([?&])(guest|login|favsheet|favtoast)=[^&]*/g, "$1")
      .replace(/[?&]+$/, "")
      .replace("?&", "?");

    returnTo += `${returnTo.indexOf("?") > -1 ? "&" : "?"}login=1`;
    writeSession("tw_fav_pending", stylistId);
    dispatch(closeLoginSheet());
    const screenPath = getScreenPath(screen);
    const encodedReturn = encodeURIComponent(returnTo);

    navigate(`${screenPath}?screen=${screen}&return=${encodedReturn}`);
  };

  const className = [
    styles.overlay,
    isMobile && styles.mobile,
    entered && !closing && styles.entered,
    closing && styles.closing,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      onClick={(event) => {
        if (event.target === event.currentTarget) setClosing(true);
      }}
    >
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="twfav-h"
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={() => setClosing(true)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className={styles.header}>
          <div className={styles.icon}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
            </svg>
          </div>
          <h2 id="twfav-h" className={styles.title}>
            Log in to save stylists
          </h2>
        </div>
        <p className={styles.body}>
          Save stylists you love and find them again on any device.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            ref={loginRef}
            className={styles.login}
            onClick={() => goToOnboarding("cust-email")}
          >
            Log in
          </button>
          <button
            type="button"
            className={styles.create}
            onClick={() => goToOnboarding("cust-create")}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

/** Guests tapping a heart see this sheet. */
export const FavLoginSheet = () => {
  const stylistId = useAppSelector((state) => state.favourites.loginSheetFor);

  return stylistId ? (
    <LoginSheetCard key={stylistId} stylistId={stylistId} />
  ) : null;
};
