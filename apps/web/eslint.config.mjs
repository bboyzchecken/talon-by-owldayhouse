import base from "@odh/eslint-config";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: ["next-env.d.ts", ".next/**", "out/**"] },
  ...base,
  {
    // Build-time Node scripts (the share-card renderer) — never bundled into the app.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
