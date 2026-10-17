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
    // scoped to script files: unscoped, the React rules crash on the .css/.json/.md files
    files: SCRIPT_FILES,
    extends: [
      "js/recommended",
      tseslint.configs.recommended,
      pluginReact.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    plugins: { js, unicorn, "react-hooks": reactHooks },
    // pinned: "detect" calls context.getFilename(), which ESLint 10 removed
    settings: { react: { version: "19.2" } },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.builtin,
      },
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
          exceptions: ["id", "x", "y", "d", "to", "on", "at", "ms", "ui"],
          exceptionPatterns: ["^w[1-5]$"],
        },
      ],
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
        {
          cases: { kebabCase: true, snakeCase: true },
          ignore: [/^__tests__$/],
        },
      ],
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/no-unused-prop-types": "warn",
      "react/prop-types": "off",
      // registered by hand: reactHooks.configs["recommended-latest"] ships `plugins` as an array, which flat config rejects
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
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
      "css/no-invalid-properties": ["error", { allowUnknownVariables: true }],
      "css/no-important": "warn",
      "css/use-baseline": "warn",
      "css/font-family-fallbacks": "warn",
    },
  },
]);
