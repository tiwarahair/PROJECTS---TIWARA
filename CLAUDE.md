# Project: Tiwara's House Website

A hair booking platform for salon owners and paying clients. Uses React 19 & Typescript 5.9

Read @CONTEXT.local.md for more context.

## Tech Stack

React 19.x and TypeScript 5.9, Redux Tool Kit

## Core Operating Rules

Keep changes scoped to the requested task. Avoid opportunistic churn.

## Coding Standards

- Simplicity first
  - code should be easy to read and understand
  - If you write 200 lines and it could be 50, rewrite it

- Adhere to best practices
- Variable names should be in camelCase and at least 3 characters long
- Keep naming consistent
- Code should avoid the use of the reduce javascript method
- Update or add tests when behavior changes
- Include short comments only where logic is non-obvious
- Files should not be too long
- Destructure objects where you can without errors & destructure map object arguments where you can
- Prefer arrow functions

- Do not commit to main
- All new changes should be on a separate branch (NOT main), always checkout from the most up to date main, if you are already on a separate branch ignore this and stay on this branch

- If there is a well-known package out there that can achieve a certain piece of logic, outsource this logic to the package, but ASK FIRST, before you decide to install it

## TypeScript Guidance

1. Keep `strict` compatibility; avoid introducing new `any` unless absolutely necessary with a comment explaining why
2. Prefer `unknown` + narrowing/type guards over `any` and broad assertions.
3. Prefer `interface` over `type` for object shapes

## Commands

1. Use `yarn` (not `npm`).
2. Useful commands:
   - `yarn format` — Prettier check
   - `yarn lint` — ESLint check

Always run `yarn format && yarn lint` after code changes.

## Architecture

- `src/components/` — reusable UI components (Button, Modal, Table, etc.)
- `src/features/` — feature modules (auth, dashboard, settings), each with its own components & hooks
- `src/hooks/` — shared custom hooks
- `src/types/` — shared TypeScript types and interfaces
- `src/utils/` — pure utility functions

## Component Conventions

- Functional components only — no class components
- Use named exports, not default exports
- Props interface named `{Component}Props` — e.g., `ButtonProps`
- Destructure props in the function signature

```tsx
// Good
export function Button({ label, onClick, variant = "primary" }: ButtonProps) {
  return (
    <button className={styles[variant]} onClick={onClick}>
      {label}
    </button>
  );
}
```

## State Management

- Local UI State: useState
- Global App State (auth, theme, cart etc.): Redux (in `src/stores/`)
- Server state: RTK Query

## Testing

- Use Vitest + React Testing Library
- Test behavior, not implementation — query by role, text, or test ID
- Every component should have at least a smoke test (renders without crashing)
- Place test utilities in `src/test/helpers.ts`

## UI & Web Design

Do not change UI unless explicitely asked, or only make suggestions, do not change without asking.

### Frontend UI Guidelines

- Modern UI: polished, interactive, responsive
- Typography: Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. The Design should be consistent throughout the app (using re-usable components etc.)
- Motion: Use animations for effects and micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.
- Should adapt to different screen sized: Desktop, Mobile, Tablet etc.
- Can add: texture wherever needed

## Do NOT

- Do not add new dependencies without discussing first
- Do not use inline styles
- Do not commit to main
