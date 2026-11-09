import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// base './' keeps every asset path relative, so one build works at
// https://<user>.github.io/deepavali/, at localhost:5173/ and from any sub-folder.
export default defineConfig({
  base: './',
  plugins: [solid()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
    // Neutral output: short hashed names, no framework-specific helper code.
    modulePreload: false,
    rolldownOptions: {
      output: {
        entryFileNames: 'a/[hash].js',
        chunkFileNames: 'a/[hash].js',
        assetFileNames: 'a/[hash][extname]',
      },
    },
  },
  // `npm run dev` talks to a local Go server (see server/README.md)
  server: { proxy: { '/api': 'http://localhost:8080' } },
});
