import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Vite inlines env vars at build time. If VITE_API_BASE_URL is missing, the
  // client falls back to a relative "/api", so a deployed dashboard calls its
  // own static host and every login POST comes back 405. Fail the build here
  // rather than ship a bundle that can only fail at runtime.
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "");
    if (!env.VITE_API_BASE_URL?.trim()) {
      throw new Error(
        "VITE_API_BASE_URL is not set.\n" +
          "The dashboard needs the kf_backend origin baked in at build time, e.g.\n" +
          "  VITE_API_BASE_URL=https://kf-backend.onrender.com\n" +
          "On Vercel: Settings -> Environment Variables, then redeploy (changing it\n" +
          "without a redeploy has no effect, because the value is compiled in).",
      );
    }
  }

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // 5174 keeps the dashboard off the site's 5173, so both can run at once and
    // the backend's CORS_ORIGINS can name both with certainty.
    server: {
      port: 5174,
      strictPort: true,
    },
  };
});
