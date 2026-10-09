# Port discrepancies

Everything where the React port differs from the Claude Design prototype (`HANDOFF.md`, prototype source), or where the prototype conflicts with this repo's `CLAUDE.md`. Each item is reported here rather than silently resolved.

## Open — needs a decision

| # | Where | Issue | Status |
| - | ----- | ----- | ------ |
| 1 | HANDOFF §7.25 | Search "Where" in production = Google Places UK. | DECIDED: keep the prototype's demo matching for now; real provider later. |
| 2 | HANDOFF §3 (every screen) | "empty / error / offline / denied — not designed". Not invented in the port. | NEEDS DECISION |
| 3 | Home — reduced motion | The prototype's reduced-motion path left "BROWSE BY STYLE" / "Six ways to find your look" invisible. | DECIDED: reduced-motion toggle removed — Home always runs the full-motion behaviour (`motion` prop and reduced branches deleted). |

## Applied — deliberate, behaviour-preserving

| # | Where | Prototype | Port | Why |
| - | ----- | --------- | ---- | --- |
| 1 | `data.js` helpers | Short names (`custOf`, `groupOf`, `fromPrice`, `dur`, `lev`, `r2`, …) | `getServiceOptions`, `getGroupId`, `getFromPrice`, `formatDuration`, `getEditDistance`, `roundPence`, … | CLAUDE.md naming rules (`getX`, ≥3 chars). Logic and outputs identical (`src/data/data.test.ts` diffs every helper against the prototype). Data keys, storage keys and query params are unchanged. |
| 2 | Assets | `img/…`, `_ds_assets/…` served next to the HTML | `src/assets/img`, `src/assets/_ds_assets`, resolved with `getAssetUrl("img/…")` | CLAUDE.md architecture (`src/assets/`). Paths in data stay the prototype's exact strings. Files are byte-identical. |
| 3 | Design tokens | `_ds/…/styles.css` + `tokens/*.css` | `src/styles/design-system/` (same relative layout), excluded from Prettier | Byte-identical copies; Prettier would reformat them. |
| 4 | zxcvbn-ts | Loaded from jsDelivr (`core@3.0.4`, `language-common@3.0.4`, `language-en@3.0.2`) | Same versions from npm, lazily `import()`ed on first check; still fires `tw-pw-ready` | Agreed: CDN libraries become npm dependencies. |
| 5 | GSAP / Leaflet | cdnjs `gsap@3.12.5` + ScrollTrigger; unpkg `leaflet@1.9.4` | npm `gsap@3.12.5`, `leaflet@1.9.4` | Agreed: CDN libraries become npm dependencies. |
| 6 | `tw-fav.js` / `tw-toast.js` | Globals on `window.TWFav`, DOM built with `innerHTML`, `tw-fav-change` event for re-renders | Redux slices (`session`, `favourites`, `toast`) + `FavHost`, `ActionToast`, `FavLoginSheet`, `AccountMenu`, `WelcomeToast` components; hooks `useFavourites`, `useShare`, `useSearchMemory` | Same storage keys, URL board switches, copy, timings and styles. Redux replaces the change event. |
| 7 | Page links | `X.dc.html?…` full page loads; return URLs use the file name (`Search.dc.html?…`) | Router routes (`/search?…`); return URLs use the path (`/search?…`) | HANDOFF §2 route table. Query strings unchanged. |
| 8 | Inline styles → CSS modules | Inline `style` beats global `a:hover` / `:focus-visible` rules | Module rules repeat the property on `:hover` / `:focus-visible` where the prototype element set it inline | Keeps the computed result identical. |
| 9 | HANDOFF §4.n element → component mapping | Maps prototype buttons (e.g. Home "Menu", "×") to DS `Button` / `IconButton` | Screens keep each element's own prototype styles | Those elements carry inline styles that differ from DS defaults; HANDOFF rule 1 (source wins). DS components are ported 1:1 in `src/components/ds/` and diffed against their `.card.html` (dev route `/__ds/:card`). |
| 10 | DS `Checkbox` / `Radio` / `Switch` | Clickable `<label>` / `<div>` without keyboard handlers | Same markup | Copied 1:1; lint reports them as warnings (a11y follow-up). |
| 11 | Home helmet CSS | Rules for `.clipcard`, `.bleedcard`, `.floatcard`, `.pinsec`, `.aboutcols`/`.abouttop`/`#aboutstack`, `.quizgrid`, `.revgrid`/`.revcols`, `#hero .herobtn2`, `@keyframes styheadin` | Ported into `home-page.module.css` though nothing uses them yet | Kept in case they are needed later (your call). |
| 12 | Home logic | `setupStyCarousel` (behind `STY_STATIC = true`), `ioReveal`, the about-photo stack tween, the search-form `searchHref`, `reviews`/`revAvg`/`revCount` | Ported but inactive: `use-stylist-carousel.ts` (`STY_STATIC`), `revealOnEnter` + stack tween in `use-home-motion.ts`, `home-search-link.ts`, `home-reviews.ts` | Kept in case they are needed later (your call). |
| 13 | Home "The problem" photo | `background-image:url('img/new/problem.jpeg')` | `url('../../assets/img/new/problem.jpeg')` | Same file, bundled by Vite. |
| 14 | Page `<helmet>` CSS | Global `<style>` per page | `@layer page` CSS module per page; page-wide element rules scoped to `html.<page>-page`, which the page sets while mounted | Same cascade (inline > helmet > tokens) without leaking between routes. |
| 15 | Search helmet keyframes | One `<style>` defines `ddIn`, `sheetFade`, `sheetUp`, `svcIn` for the whole page | Each component module carries a copy of the keyframes it uses | CSS modules scope keyframe names per file; values identical. |
| 16 | Search `baseVals` | Builds an older service picker, day/category/venue chips, time options, location list, results and suggestions that `renderVals` overrides or the template never renders | Kept, unused, in `search-legacy.ts` | Your rule: keep unused logic until the final clean-up. |
| 17 | Search comboboxes / price slider | No `aria-controls` on the What/Where comboboxes; `linear-gradient(… 0 var(--fill) …)` track | Kept verbatim with targeted lint disables | Copy exactly; the CSS linter cannot parse two-position colour stops. |
