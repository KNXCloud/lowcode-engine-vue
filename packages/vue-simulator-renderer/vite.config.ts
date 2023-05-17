import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';
import VueJsx from '@vitejs/plugin-vue-jsx';
import pkg from './package.json';

export default defineConfig({
  plugins: [VueJsx(), LibTypes({ fileName: 'vue-simulator-renderer.d.ts' })],
  build: {
    sourcemap: true,
    target: 'ES2018',
    lib: {
      entry: 'src/index.ts',
      fileName: () => 'vue-simulator-renderer.mjs',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.peerDependencies),
      ].filter((item) => !item.includes('@alilc')),
      output: {
        assetFileNames({ name }) {
          return name === 'style.css' ? 'vue-simulator-renderer.css' : name!;
        },
      },
    },
  },
});
