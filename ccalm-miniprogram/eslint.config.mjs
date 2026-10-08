import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

const wxGlobals = {
  wx: "readonly",
  App: "readonly",
  Page: "readonly",
  Component: "readonly",
  Behavior: "readonly",
  getApp: "readonly",
  getCurrentPages: "readonly",
};

export default defineConfig([
  globalIgnores([
    "**/miniprogram_npm/**",
    "**/node_modules/**",
    "eslint.config.mjs",
  ]),
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended, eslintPluginPrettierRecommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.es2022,
        ...globals.node,
        ...wxGlobals,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "prettier/prettier": "error",
    },
  },
]);
