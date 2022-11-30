import { defineConfig } from 'vite';
import libTypes from 'vite-plugin-lib-types';
import pkg from './package.json';

export default defineConfig({
  plugins: [libTypes({ fileName: 'vue-simulator-renderer.d.ts' })],
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: () => 'vue-simulator-renderer.mjs',
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
