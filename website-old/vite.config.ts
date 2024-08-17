/** @type {import('vite').UserConfig} */
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		cors: false,
		proxy: {
			"/api": {
				target: "https://schedulesky.tomo-x.workers.dev/",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				login: resolve(__dirname, "login/index.html"),
			},
		},
	},
});
