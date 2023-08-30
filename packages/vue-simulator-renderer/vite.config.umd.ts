import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify('false'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    sourcemap: true,
    target: 'ES2018',
    lib: {
      name: 'LCVueSimulatorRenderer',
      entry: 'src/index.ts',
      fileName: () => 'vue-simulator-renderer.js',
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
        assetFileNames: 'vue-simulator-renderer.css',
      },
    },
  },
});
