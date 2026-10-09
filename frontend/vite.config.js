import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend always calls "/api"; in dev Vite forwards that to the FastAPI server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8002" },
  },
});
