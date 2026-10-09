// SVG paths repeated across the profile (heart, share arrow, back arrow), verbatim from the prototype markup.

export const HeartPath = () => (
  <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"></path>
);

export const SharePaths = () => (
  <>
    <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"></path>
    <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"></path>
  </>
);

export const BackPath = () => <path d="M19 12H5M11 6l-6 6 6 6"></path>;
