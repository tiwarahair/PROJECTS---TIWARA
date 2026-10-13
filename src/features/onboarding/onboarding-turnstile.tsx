import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import type { RefObject } from "react";
import styles from "../../styles/features/onboarding/onboarding-turnstile.module.css";

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
}: OnboardingTurnstileProps) => (
  <div className={styles.wrap}>
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
    />
  </div>
);
