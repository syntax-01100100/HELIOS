import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
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
