import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    exclude: ["node_modules/**", ".next/**"],
  },
});
