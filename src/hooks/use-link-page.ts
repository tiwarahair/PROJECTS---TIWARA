import { useLayoutEffect } from "react";
import { usePrivateLink } from "./use-private-link";

/** A client's page opened from an emailed link: its token (see usePrivateLink), on the manage pages' backdrop. */
export const useLinkPage = (storageKey: string) => {
  const token = usePrivateLink({ storageKey });

  useLayoutEffect(() => {
    document.documentElement.classList.add("manage-page");

    return () => document.documentElement.classList.remove("manage-page");
  }, []);

  return token;
};
