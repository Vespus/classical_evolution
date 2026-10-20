import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' – die gebaute Seite funktioniert aus jedem Unterverzeichnis (und per file-Server).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', chunkSizeWarningLimit: 600 },
});
