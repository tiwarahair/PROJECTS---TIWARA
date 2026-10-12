import css from "@eslint/css";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unicorn from "eslint-plugin-unicorn";

const SCRIPT_FILES = ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"];

export default defineConfig([
  { ignores: ["dist", "node_modules", "coverage"] },

  {
    // Scoped to script files. Left unscoped, these configs also get applied to
    // the .css/.json/.md files below and the React rules crash on them.
    files: SCRIPT_FILES,
    extends: [
      "js/recommended",
      tseslint.configs.recommended,
      pluginReact.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    plugins: { js, unicorn, "react-hooks": reactHooks },
    // Pinned rather than "detect": eslint-plugin-react@7's version detection
    // calls context.getFilename(), which ESLint 10 removed, and crashes.
    settings: { react: { version: "19.2" } },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.builtin,
      },
      // tseslint.parser rather than a direct @typescript-eslint/parser import:
      // that package is not a declared dependency, it only resolves transitively.
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-nested-ternary": "error",
      "prefer-template": "error",
      "id-length": [
        "error",
        {
          min: 3,
          properties: "always",
          exceptions: ["id", "x", "y", "to", "on", "at", "ms", "ui"],
          // the onboarding wizard's screen ids, which appear in ?screen= URLs
          exceptionPatterns: ["^w[1-5]$"],
        },
      ],
      // blank lines around blocks, returns, exports and after declarations so code isn't squashed together
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
        { blankLine: "always", prev: "*", next: "block-like" },
        { blankLine: "always", prev: "block-like", next: "*" },
        { blankLine: "always", prev: "*", next: "export" },
        { blankLine: "any", prev: "export", next: "export" },
        { blankLine: "any", prev: "import", next: "import" },
        // also around ifs and loops (with or without braces) and anything spanning several lines
        {
          blankLine: "always",
          prev: "*",
          next: ["if", "for", "while", "do", "switch", "try"],
        },
        {
          blankLine: "always",
          prev: ["if", "for", "while", "do", "switch", "try"],
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: ["multiline-expression", "multiline-const", "multiline-let"],
        },
        {
          blankLine: "always",
          prev: ["multiline-expression", "multiline-const", "multiline-let"],
          next: "*",
        },
      ],

      "unicorn/prefer-set-has": "off",
      "unicorn/filename-case": [
        "error",
        { cases: { kebabCase: true, snakeCase: true } },
      ],

      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/no-unused-prop-types": "warn",
      // TypeScript prop interfaces replace runtime prop-types entirely.
      "react/prop-types": "off",

      // Registered explicitly rather than via reactHooks.configs["recommended-latest"]:
      // that export ships `plugins` as an array, which flat config rejects.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // The ported markup keeps clickable <div>/<span> in ~14 places
      // (.service-card, .bp-swatch, .bp-cal-d, .t-dot, ...). Promoting them to
      // <button> changes UA font/border/background inheritance and adds focus
      // rings — a visual change this port is not allowed to make. Tracked as a
      // separate a11y follow-up; warn so it stays visible rather than silenced.
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      // Same reasoning, same follow-up: <a href="#"> used as a button in the
      // nav, footer and gallery; booking-step labels that sit next to their
      // input rather than wrapping it; and alt text that says "photo".
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/img-redundant-alt": "warn",
      // Components take an autoFocus prop (AddressFinder, AllergyField) from the prototype's props
      // contract; only flag the DOM attribute.
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
      // The prototype's external links use rel="noopener" (no noreferrer); kept verbatim.
      "react/jsx-no-target-blank": ["error", { allowReferrer: true }],
    },
  },

  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    language: "json/json5",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      // The stylesheet is split across files that share one :root block in
      // base.css, and this rule resolves variables per file. Without this it
      // reports every var() outside base.css as unknown.
      "css/no-invalid-properties": ["error", { allowUnknownVariables: true }],

      // Both of the following flag pre-existing traits of the original
      // stylesheet, which the React port is required to carry over unchanged:
      // six !important declarations (nav.scrolled and .bp-cal-d.sel-day), and
      // backdrop-filter / user-select / resize / accent-color. Warn so they
      // stay visible for a later cleanup instead of blocking the build.
      "css/no-important": "warn",
      "css/use-baseline": "warn",
      // Prototype values such as font-family: Schibsted Grotesk (no generic fallback) are copied verbatim.
      "css/font-family-fallbacks": "warn",
    },
  },
]);
