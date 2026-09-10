const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

module.exports = defineConfig({
    plugins: [react()],
    root: __dirname,
    build: {
        outDir: path.resolve(__dirname, "../public/app"),
        emptyOutDir: true
    }
});