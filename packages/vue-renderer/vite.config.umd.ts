import { defineConfig } from 'vite';

export default defineConfig({
  define: {
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
