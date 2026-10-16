import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  getSearchParams,
  readSession,
  writeSession,
} from "../utils/page-flags";

/**
 * A page opened from an emailed link whose ?token= acts as a password: the token moves into this tab's
 * session (so a reload still works) and out of the address bar, and the page sends no referrer.
 */
export const usePrivateLink = (storageKey: string) => {
  const navigate = useNavigate();

  const [token] = useState(() => {
    const fromUrl = getSearchParams().get("token");

    if (fromUrl) writeSession(storageKey, fromUrl);

    return fromUrl ?? readSession(storageKey) ?? "";
  });

  useLayoutEffect(() => {
    const meta = document.createElement("meta");

    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.append(meta);

    return () => meta.remove();
  }, []);

  useEffect(() => {
    const params = getSearchParams();

    if (!params.has("token")) return;

    params.delete("token");
    const search = params.toString();

    void navigate({ search: search ? `?${search}` : "" }, { replace: true });
  }, [navigate]);

  return token;
};
