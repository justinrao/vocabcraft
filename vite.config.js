import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: 'public/index.html'
    }
  },
  define: {
    'process.env.VERCEL_GIT_COMMIT_SHA': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || 'development')
  }
});