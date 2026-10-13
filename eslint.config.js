import globals from "globals";
import jsdocPlugin from "eslint-plugin-jsdoc";
import tsParser from "@typescript-eslint/parser";
import love from "eslint-config-love";

// Alter this config file to meet your project's needs and standards.

export default [
  {
    ...love,
    files: ["**/*.js", "**/*.ts"],
  },
  // JS/Default config (no parser override)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  // TypeScript config (only for TS files)
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      indent: "off", // Prettier is handling this
      "linebreak-style": "off", // Prettier is handling this
      quotes: "off", // Prettier is handling this
      semi: "off", // Prettier is handling this
      "no-console": "off", // Stops complaining about putting messages in the console
      "no-param-reassign": ["error", { props: false }], // Allow modifying properties of function parameters (common in Express middleware and reducers)
      "no-negated-condition": "off", // Allow negated conditions as they can improve readability in certain contexts
      "require-unicode-regexp": ["error", { requireFlag: "u" }],
      "jsdoc/check-alignment": "error",
      "jsdoc/check-param-names": "error",
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-types": "error",
      "jsdoc/implements-on-classes": "error",
      "jsdoc/newline-after-description": "off",
      "jsdoc/no-undefined-types": "error",
      "jsdoc/require-description": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
      "jsdoc/require-param": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-param-name": "error",
      "jsdoc/require-param-type": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-check": "error",
      "jsdoc/require-returns-description": "error",
      "jsdoc/require-returns-type": "error",
      // TypeScript declaration file best practices
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowStaticOnly: true },
      ],
      "@typescript-eslint/no-namespace": "off", // Allow namespaces for declaration files
      "@typescript-eslint/triple-slash-reference": [
        "error",
        { path: "never", types: "prefer-import", lib: "never" },
      ],
      "@typescript-eslint/no-var-requires": "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Eligibility module boundary rules
  {
    files: ["src/eligibility/**/*.ts", "!src/eligibility/**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "#src/*",
                "#utils/*",
                "#types/*",
                "#routes/*",
                "#middleware/*",
                "#helpers/*",
                "../../*",
              ],
              message:
                "The eligibility module must stay reusable. Import only from within src/eligibility/ or from @ministryofjustice/hmpps-forge.",
            },
          ],
        },
      ],
    },
  },
  // Eligibility adapter-specific rules: relax JSDoc for complex nested types (TypeScript covers the typing)
  {
    files: ["src/eligibility/adapters/**/*.ts"],
    rules: {
      "jsdoc/require-param": "off", // TypeScript types cover this
      "jsdoc/require-param-type": "off", // TypeScript types cover this
      "jsdoc/require-param-description": "off", // Optional for adapters
      "jsdoc/require-returns-type": "off", // TypeScript return types cover this
      "jsdoc/check-param-names": "off", // TypeScript covers this
    },
  },
  // Host code must import eligibility only from index.ts
  {
    files: ["src/journeys/**/*.ts", "src/controllers/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["src/eligibility/*"],
              message: "Import from src/eligibility/index.ts only",
            },
          ],
        },
      ],
    },
  },
  // Add a separate config for declaration files
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Sometimes needed in d.ts
      "@typescript-eslint/no-empty-interface": "off", // Sometimes needed in d.ts
      "@typescript-eslint/no-namespace": "off", // Namespaces are allowed in d.ts
    },
  },
  // Ignore patterns
  {
    ignores: [
      "node_modules/*",
      "public/*",
      "tests/**/*.spec.ts", // Unit test specs (if any remain in tests/)
      "src/eligibility/**/*.spec.ts", // Eligibility module specs live with the module
      "tests/playwright/**/*.spec.ts", // E2E test specs in new Playwright structure
      "tests/playwright/fixtures/*", // Test fixtures
      "tests/playwright/factories/*", // Test factories and mock handlers
      "tests/playwright/pages/*", // Page object models
      "tests/playwright/utils/*", // Test utilities and helpers
      "tests/playwright/playwright.config.ts", // Playwright configuration file
      "tests/helpers/*", // Test helper utilities (if any remain)
      "docs/source/javascripts/application.js", // Parsing error this file was not found by the project service. Consider either including it in the `tsconfig.json` or including it in `allowDefaultProject`
      "docs/source/javascripts/govuk_frontend.js", // Documentation JavaScript file, not part of main TypeScript project
      "eslint.config.js", // Parsing error this file was not found by the project service. Consider either including it in the `tsconfig.json` or including it in `allowDefaultProject`,
      "coverage", // Ignore the code coverage output from linter
      "scripts/e2e_coverage/*", // Route coverage analysis scripts
      "playwright/*", // Ignore local Playwright output
    ],
  },
];
