// Inline SVG bodies used by Search's suggestion rows (prototype Search ICONS), rendered as innerHTML like the prototype.
export const SEARCH_ICONS: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><path d="M17.5 14.5v6M14.5 17.5h6"></path>',
  braids:
    '<path d="M8 3c0 4 8 5 8 9s-8 5-8 9"></path><path d="M16 3c0 4-8 5-8 9s8 5 8 9"></path>',
  wigs: '<path d="M12 2.5C7.6 2.5 5.6 5.8 5.6 9.8c0 2.8-.8 5-2.6 6.8 1.4 1 3.2 1 4.4 0-.4 1.8.4 3.4 2 4.4.6-2.4.6-5-.2-7.4-.6-1.8-.8-3.4-.8-4.8 1.8-.6 3-1.8 3.6-3.6"></path><path d="M12 2.5c4.4 0 6.4 3.3 6.4 7.3 0 2.8.8 5 2.6 6.8-1.4 1-3.2 1-4.4 0 .4 1.8-.4 3.4-2 4.4-.6-2.4-.6-5 .2-7.4.6-1.8.8-3.4.8-4.8-1.8-.6-3-1.8-3.6-3.6"></path>',
  weaves:
    '<path d="M6 3v13a4 4 0 0 0 8 0V7"></path><circle cx="18" cy="5" r="2"></circle>',
  locs: '<path d="M6.6 12.6a5.4 5.4 0 0 1 10.8 0v2.6c0 3.3-2.4 5.8-5.4 5.8s-5.4-2.5-5.4-5.8z"></path><path d="M6.8 11.4c1.6-.9 3.4-1.3 5.2-1.3s3.6.4 5.2 1.3"></path><path d="M6.6 13.8c-.9 0-1.5.7-1.5 1.5s.6 1.5 1.5 1.5"></path><path d="M17.4 13.8c.9 0 1.5.7 1.5 1.5s-.6 1.5-1.5 1.5"></path><path d="M10.2 7.6c1.2-.5 2.4-.5 3.6 0"></path><path d="M12 7.2V2"></path><path d="M11 7.2 8 2.8"></path><path d="M13 7.2l3-4.4"></path><path d="M10 7.6C8 5.6 6 4.8 4.4 5"></path><path d="M14 7.6c2-2 4-2.8 5.6-2.6"></path><path d="M9.6 8.4C7 7.6 4.6 8 2.8 9.6"></path><path d="M14.4 8.4c2.6-.8 5-.4 6.8 1.2"></path>',
  natural:
    '<path d="M8.53 17.93A1.83 1.83 0 0 1 5.83 15.9A1.83 1.83 0 0 1 4.17 12.94A1.83 1.83 0 0 1 3.85 9.57A1.83 1.83 0 0 1 4.93 6.35A1.83 1.83 0 0 1 7.21 3.85A1.83 1.83 0 0 1 10.31 2.48A1.83 1.83 0 0 1 13.69 2.48A1.83 1.83 0 0 1 16.79 3.85A1.83 1.83 0 0 1 19.07 6.35A1.83 1.83 0 0 1 20.15 9.57A1.83 1.83 0 0 1 19.83 12.94A1.83 1.83 0 0 1 18.17 15.9A1.83 1.83 0 0 1 15.47 17.93"></path><path d="M8.53 17.93V12.4a3.47 3.47 0 0 1 6.94 0v5.53"></path>',
  treatments:
    '<path d="M12 21c-4 0-7-3-7-7 0-5 7-11 7-11s7 6 7 11c0 4-3 7-7 7z"></path>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="3"></circle>',
  arrow: '<path d="M3 11l18-8-8 18-2-7-8-3z"></path>',
  search:
    '<circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>',
};
