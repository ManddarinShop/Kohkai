import { defineConfig } from "vitest/config";

// Package-owned Vitest configuration. Kohkai owns its test entrypoints so
// `npm test` runs golden-vector and boundary tests independently of Hikoutei.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
