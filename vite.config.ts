import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import solid from 'vite-plugin-solid';

// Writes sw.js after the build: the files to keep on the device, plus a version that changes
// whenever any of them changes (openspec/changes/add-offline-and-install/design.md).
// Icons are left out: browsers fetch them once when installing, and play never needs them.
function offlineShell(): Plugin {
  let root = '';
  let outDir = '';
  return {
    name: 'offline-shell',
    apply: 'build',
    configResolved(c) {
      root = c.root;
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split(sep).join('/'));
        }
      };
      walk(outDir);
      const shell = files.filter(f => f !== 'sw.js' && !f.startsWith('icons/')).sort();
      const hash = createHash('sha256');
      for (const f of shell) hash.update(f).update(readFileSync(join(outDir, f)));
      const list = shell.map(f => (f === 'index.html' ? './' : f));
      const sw = readFileSync(resolve(root, 'pwa/sw.js'), 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 16))
        .replace('__FILES__', JSON.stringify(list));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

// base './' keeps every asset path relative, so one build works at
// https://<user>.github.io/deepavali/, at localhost:5173/ and from any sub-folder.
// Lazily loaded chunks bring a small loader helper whose error event names the bundler; rename it.
function neutralNames(): Plugin {
  return {
    name: 'neutral-names',
    apply: 'build',
    renderChunk(code) {
      return code.includes('vite:preloadError') ? code.replaceAll('vite:preloadError', 'chunk:loaderror') : null;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [solid(), neutralNames(), offlineShell()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
    // three.js is one lazily loaded chunk (about 145 KB gzipped), precached by the offline shell.
    chunkSizeWarningLimit: 600,
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
