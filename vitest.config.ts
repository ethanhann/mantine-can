import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { NON_LIBRARY_SOURCE } from "./config.shared";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		passWithNoTests: true,
		setupFiles: ["./src/test/setup.ts"],
		css: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary", "json"],
			include: ["src/**/*.{ts,tsx}"],
			// Shared non-library globs, plus the barrel (re-exports only, nothing to cover).
			exclude: [...NON_LIBRARY_SOURCE, "src/index.ts"],
			thresholds: {
				statements: 90,
				branches: 85,
				functions: 90,
				lines: 90,
			},
		},
	},
});
