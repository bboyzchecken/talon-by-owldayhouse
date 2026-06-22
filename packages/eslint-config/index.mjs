import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/**
 * Shared base ESLint flat config for the ODH monorepo (TypeScript + React).
 * Consume from a package's eslint.config.mjs:
 *   import config from "@odh/eslint-config";
 *   export default config;
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/.turbo/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      // Pinned (whole repo is React 19) so config-only packages without the
      // "react" dep don't emit a version-detect warning.
      react: { version: "19" },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Next.js / modern React JSX transform — no need to import React.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
);
