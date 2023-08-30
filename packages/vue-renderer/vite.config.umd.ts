import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify('false'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'ES2018',
    sourcemap: true,
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
