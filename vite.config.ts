import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Note: In development, Express serves this app with Vite middleware (middlewareMode)
// This config is only used for standalone Vite preview or build validation
export default defineConfig({
  plugins: [react()],
});
