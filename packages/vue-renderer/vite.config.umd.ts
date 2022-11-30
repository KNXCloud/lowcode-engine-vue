import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import VueJsx from '@vitejs/plugin-vue-jsx';

export default defineConfig({
  plugins: [Vue(), VueJsx()],
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify('false'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      name: 'LCVueRenderer',
      entry: 'src/index.ts',
      fileName: () => 'vue-renderer.js',
      formats: ['umd'],
    },
    emptyOutDir: false,
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});
