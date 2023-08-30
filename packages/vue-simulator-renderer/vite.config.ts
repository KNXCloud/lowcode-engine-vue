import { defineConfig } from 'vite';
import types from 'vite-plugin-lib-types';
import pkg from './package.json';

export default defineConfig({
  plugins: [types()],
  build: {
    sourcemap: true,
    minify: false,
    target: 'ES2018',
    lib: {
      entry: { 'vue-simulator-renderer': 'src/index.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
      output: {
        assetFileNames({ name }) {
          return name === 'style.css' ? 'vue-simulator-renderer.css' : name!;
        },
      },
    },
  },
});
