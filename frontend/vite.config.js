import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          const normalized = id.split('node_modules/')[1];
          const pkg = normalized.startsWith('@')
            ? normalized.split('/').slice(0, 2).join('/')
            : normalized.split('/')[0];

          if (pkg === 'react-big-calendar' || pkg === 'moment') {
            return 'calendar-vendor';
          }

          if (pkg === 'socket.io-client') {
            return 'chat-vendor';
          }

          if (pkg === '@excalidraw/excalidraw') {
            return 'whiteboard-core';
          }

          if (pkg === 'mermaid' || pkg === 'elkjs') {
            return 'diagram-vendor';
          }

          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'react-router-dom') {
            return 'react-vendor';
          }

          if (pkg === '@tanstack/react-query' || pkg === 'axios') {
            return 'data-vendor';
          }

          if (pkg === 'lucide-react' || pkg === 'react-hot-toast') {
            return 'ui-vendor';
          }
        },
      },
    },
  },
})
