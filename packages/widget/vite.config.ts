import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ChurchAudioWidget',
      fileName: 'church-audio-widget',
      formats: ['iife'],  // Single self-executing file for <script> tag usage
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
