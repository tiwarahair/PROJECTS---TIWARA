import { useEffect } from "react";
import type { RefObject } from "react";

/** On load, scroll the stylist row so the second card is centred (prototype Home centreSty). */
export const useCentreSecondCard = (
  rowRef: RefObject<HTMLElement | null>,
  cardSelector: string,
) => {
  useEffect(() => {
    let timer = 0;

    const centre = (attempt: number) => {
      const row = rowRef.current;
      const card = row?.querySelectorAll<HTMLElement>(cardSelector)[1];

      if (!row || !card || !card.offsetWidth) {
        if (attempt < 40)
          timer = window.setTimeout(() => centre(attempt + 1), 150);

        return;
      }

      row.scrollLeft =
        card.offsetLeft -
        row.offsetLeft -
        (row.clientWidth - card.offsetWidth) / 2;
    };

    centre(0);

    return () => window.clearTimeout(timer);
  }, [rowRef, cardSelector]);
};
