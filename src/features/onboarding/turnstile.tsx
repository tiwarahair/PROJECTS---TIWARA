import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useEffect, useRef, useState } from "react";
import { joinClassNames } from "../../utils/class-names";
import type { RefObject } from "react";
import styles from "../../styles/features/onboarding/turnstile.module.css";

interface OnboardingTurnstileProps {
  isDark: boolean;
  widgetRef: RefObject<TurnstileInstance | null>;
  onToken: (token: string | null) => void;
}

/** Cloudflare Turnstile: invisible unless Cloudflare needs the visitor to tick a box. */
export const OnboardingTurnstile = ({
  isDark,
  widgetRef,
  onToken,
}: OnboardingTurnstileProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isShown, setShown] = useState(false);

  // the check's frame can take focus as it loads (focus moving into a frame fires no event here); give it
  // back to the field, unless the pointer is on the check itself
  useEffect(() => {
    const onFocusOut = ({ target }: FocusEvent) => {
      if (!(target instanceof HTMLInputElement)) return;

      window.setTimeout(() => {
        const wrap = wrapRef.current;

        if (wrap?.contains(document.activeElement) && !wrap.matches(":hover"))
          target.focus();
      });
    };

    document.addEventListener("focusout", onFocusOut);

    return () => document.removeEventListener("focusout", onFocusOut);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={joinClassNames(styles.wrap, isShown && styles.wrapShown)}
    >
      <Turnstile
        ref={widgetRef}
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        options={{
          appearance: "interaction-only",
          theme: isDark ? "dark" : "light",
          size: "flexible",
        }}
        onSuccess={onToken}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
        onBeforeInteractive={() => setShown(true)}
        onAfterInteractive={() => setShown(false)}
      />
    </div>
  );
};
