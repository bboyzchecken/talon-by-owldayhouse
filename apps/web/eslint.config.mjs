import base from "@odh/eslint-config";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: ["next-env.d.ts", ".next/**", "out/**"] },
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
