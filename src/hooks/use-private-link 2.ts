import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  getSearchParams,
  readSession,
  writeSession,
} from "../utils/page-flags";

/**
 * A page opened from an emailed link whose ?token= (or another param) acts as a password: the token leaves the
 * address bar, the page sends no referrer and, given a storage key, a reload in the same tab still works.
 */
export const usePrivateLink = ({
  param = "token",
  storageKey,
}: {
  param?: string;
  storageKey?: string;
}) => {
  const navigate = useNavigate();

  const [token] = useState(() => {
    const fromUrl = getSearchParams().get(param);

    if (!storageKey) return fromUrl ?? "";

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

    if (!params.has(param)) return;

    params.delete(param);
    const search = params.toString();

    void navigate({ search: search ? `?${search}` : "" }, { replace: true });
  }, [navigate, param]);

  return token;
};
