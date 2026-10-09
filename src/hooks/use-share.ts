import { useCallback } from "react";
import { useAppDispatch } from "../stores/hooks";
import { showToast } from "../stores/toast-slice";

interface ShareTarget {
  id: string;
  name: string;
  area?: string;
}

export interface ShareData {
  url: string;
  title: string;
  text: string;
  wa: string;
  mail: string;
}

/** Clean profile URL plus WhatsApp / email links (prototype tw-fav.js shareData). */
export const getShareData = ({ id, name, area }: ShareTarget): ShareData => {
  const url =
    window.location.origin + "/stylist?stylist=" + encodeURIComponent(id);
  const title = name + " on Tiwára’s House";
  const text = name + " · " + (area || "");
  return {
    url,
    title,
    text,
    wa: "https://wa.me/?text=" + encodeURIComponent(text + " " + url),
    mail:
      "mailto:?subject=" +
      encodeURIComponent(title) +
      "&body=" +
      encodeURIComponent(text + "\n" + url),
  };
};

export const canShareNatively = (): boolean => !!navigator.share;

const copyWithTextarea = (url: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // nothing else to try
  }
  textarea.remove();
};

export const useShare = () => {
  const dispatch = useAppDispatch();

  /** Native share sheet when available; returns false so the caller opens its own popover. */
  const share = useCallback((target: ShareTarget): boolean => {
    if (!navigator.share) return false;
    const { title, text, url } = getShareData(target);
    navigator.share({ title, text, url }).catch(() => {});
    return true;
  }, []);

  const copyLink = useCallback(
    (url: string) => {
      const done = () => dispatch(showToast("Link copied"));
      if (navigator.clipboard?.writeText)
        navigator.clipboard.writeText(url).then(done, () => {
          copyWithTextarea(url);
          done();
        });
      else {
        copyWithTextarea(url);
        done();
      }
    },
    [dispatch],
  );

  return { share, copyLink, canShare: canShareNatively };
};
