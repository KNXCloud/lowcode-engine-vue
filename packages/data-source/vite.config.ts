import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';

import pkg from './package.json';

export default defineConfig(({ command }) => ({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
    },
  },
  plugins: [
    LibTypes({
      enable: command === 'build',
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    target: 'ES2018',
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es'],
    },
    emptyOutDir: true,
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
    },
  },
}));
