import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom") ||
            id.includes("react-router")
          ) {
            return "react-vendor";
          }
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("dayjs") || id.includes("date-fns")) return "date";
          if (id.includes("@amap")) return "amap";
          if (id.includes("lucide-react")) return "lucide";
        },
      },
    },
  },
});
