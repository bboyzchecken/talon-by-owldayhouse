import base from "@odh/eslint-config";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // public/showcase/** is a self-contained, pre-built static sub-app (the Reveal
  // showcase from talon-pipeline) — don't lint its bundled/minified output.
  { ignores: ["next-env.d.ts", ".next/**", "out/**", "public/showcase/**"] },
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
