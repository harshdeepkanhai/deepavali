import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// base './' keeps every asset path relative, so one build works at
// https://<user>.github.io/deepavali/, at localhost:5173/ and from any sub-folder.
export default defineConfig({
  base: './',
  plugins: [solid()],
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
