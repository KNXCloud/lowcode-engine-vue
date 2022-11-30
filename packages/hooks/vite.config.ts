import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';

import pkg from './package.json';

export default defineConfig({
  plugins: [LibTypes()],
  build: {
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
