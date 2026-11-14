import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        health: fileURLToPath(new URL('./health.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          tensorflow: ['@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
          mediapipe: ['@mediapipe/tasks-vision'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
