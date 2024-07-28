/** @type {import('vite').UserConfig} */
export default {
    server:{
        cors: false,
        proxy:{
            "/api": {
                target: "https://schedulesky.tomo-x.workers.dev/",
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
}