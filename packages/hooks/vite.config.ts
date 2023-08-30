import { defineConfig } from 'vite';
import types from 'vite-plugin-lib-types';

import pkg from './package.json';

export default defineConfig({
  plugins: [types()],
  build: {
    target: 'ES2018',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es'],
    },
    emptyOutDir: true,
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
    },
  },
});
