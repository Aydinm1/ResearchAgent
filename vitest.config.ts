import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: (() => {
    const env = loadEnv("test", process.cwd(), "");
    Object.assign(process.env, env);
    return {
      environment: "node",
      include: ["tests/**/*.test.ts"]
    };
  })(),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
