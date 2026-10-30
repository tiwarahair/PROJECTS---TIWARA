import { useLayoutEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { useNavMorph } from "../../hooks/use-nav-morph";
import { useAppSelector } from "../../stores/hooks";
import { MarketingFooter } from "../marketing-footer";
import { MarketingNav } from "../marketing-nav";
import styles from "../../styles/components/story-page/index.module.css";

interface StoryPageProps {
  label: string;
  rootRef: RefObject<HTMLDivElement | null>;
  hasRustBookNow?: boolean;
  children: ReactNode;
}

export const StoryPage = ({
  label,
  rootRef,
  hasRustBookNow = false,
  children,
}: StoryPageProps) => {
  const loggedIn = useAppSelector(({ session }) => session.loggedIn);
  const morph = useNavMorph();

  useLayoutEffect(() => {
    document.documentElement.classList.add("story-page");

    return () => document.documentElement.classList.remove("story-page");
  }, []);

  return (
    <div ref={rootRef} data-screen-label={label} className={styles.page}>
      <MarketingNav
        morph={morph}
        loggedIn={loggedIn}
        hasRustBookNow={hasRustBookNow}
      />
      {children}
      <MarketingFooter />
    </div>
  );
};
