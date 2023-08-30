import { defineConfig } from 'vitest/config';
import types from 'vite-plugin-lib-types';
import vueJsx from '@vitejs/plugin-vue-jsx';
import pkg from './package.json';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
    },
  },
  plugins: [
    types({
      fileName: 'vue-renderer.d.ts',
      tsconfigPath: './tsconfig.build.json',
    }),
    vueJsx(),
  ],
  build: {
    target: 'ES2018',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      fileName: () => 'vue-renderer.mjs',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.peerDependencies),
      ].filter((item) => !item.includes('@alilc')),
    },
  },
});
