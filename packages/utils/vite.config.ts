import { defineConfig } from 'vite';
import libTypes from 'vite-plugin-lib-types';

import pkg from './package.json';

export default defineConfig({
  plugins: [libTypes()],
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
