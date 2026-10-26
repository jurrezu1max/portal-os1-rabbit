import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/coverage/**"] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("chart.js") || id.includes("react-chartjs"))
            return "charts";
          if (
            id.includes("/d3-") ||
            id.includes("/d3/") ||
            id.includes("internmap")
          )
            return "graph";
          if (
            id.includes("ml-matrix") ||
            id.includes("is-any-array") ||
            id.includes("ml-array")
          )
            return "spectral";
          if (id.includes("framer-motion") || id.includes("motion-"))
            return "motion";
        },
      },
    },
  },
});
