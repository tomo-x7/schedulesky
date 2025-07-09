import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		port: process.env.PORT as unknown as number,
	},
	plugins: [react()],
});
