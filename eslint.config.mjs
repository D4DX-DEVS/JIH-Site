import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    rules: {
      "no-alert": "error",
      // `const { omitted: _x, ...rest } = row` is the idiom for dropping a field.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Native <select> is banned. Use <Select> from components/ui/select.",
        },
        {
          selector: "JSXOpeningElement[name.name='dialog']",
          message: "Native <dialog> is banned. Use Dialog / AlertDialog from components/ui.",
        },
      ],
    },
  },
  {
    // CLI scripts report progress on stdout.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "migration/data/**",
    "playwright-report/**",
    "test-results/**",
    "cloudflare-env.d.ts",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
