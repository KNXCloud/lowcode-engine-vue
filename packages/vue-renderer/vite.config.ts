import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';
import VueJsx from '@vitejs/plugin-vue-jsx';
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
    VueJsx(),
    LibTypes({
      fileName: 'vue-renderer.d.ts',
      enable: command === 'build',
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    target: 'ES2018',
    sourcemap: true,
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
}));
