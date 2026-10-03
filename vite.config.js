import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "firebase-auth": ["firebase/auth"],
          "firebase-data": ["firebase/firestore"],
          "firebase-services": [
            "firebase/functions",
            "firebase/storage",
            "firebase/app-check",
          ],
          "react-vendor": ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    fs: {
      deny: [
        ".env",
        ".env.*",
        "**/*API.txt",
        "**/*secret*",
        "**/firebase configure.txt",
        "**/functions/**",
        "**/archive/**",
      ],
    },
    watch: {
      ignored: ["**/admin_windows/**", "**/.npm-cache/**", "**/artifacts/**"],
    },
  },
});
