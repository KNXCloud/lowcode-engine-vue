import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
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
        assetFileNames({ name }) {
          return name === 'style.css' ? 'vue-simulator-renderer.css' : name!;
        },
      },
    },
  },
});
