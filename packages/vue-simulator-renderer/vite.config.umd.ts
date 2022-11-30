import { defineConfig } from 'vite';

export default defineConfig({
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
