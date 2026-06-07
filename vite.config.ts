import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react(),
		dts({
			tsconfigPath: "tsconfig.build.json",
			include: ["src"],
			exclude: [
				"src/**/*.test.{ts,tsx}",
				"src/test/**",
				"src/**/*.stories.tsx",
			],
		}),
	],
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, "src/index.ts"),
				"presets/index": resolve(__dirname, "src/presets/index.ts"),
			},
			formats: ["es"],
		},
		rollupOptions: {
			external: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"@mantine/core",
				"@mantine/hooks",
			],
			output: {
				// Preserve the module graph so a consumer importing only the headless
				// engine (`can`/`resolve`) never pulls in the Mantine presentation files.
				preserveModules: true,
				preserveModulesRoot: "src",
				entryFileNames: "[name].js",
				assetFileNames: "mantine-can.css",
			},
		},
	},
});
