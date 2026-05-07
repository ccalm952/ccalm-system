import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["**/dist/**"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
      /** 合法的「挂载拉数 / props 同步」等模式会被误报 */
      "react-hooks/set-state-in-effect": "off",
      /** 与 useRef 保存回调、弹层关闭帧等常见写法冲突 */
      "react-hooks/refs": "off",
      /** TanStack Table 等库 */
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
