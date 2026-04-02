import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";

import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
// Vite does not run /api/* (Vercel serverless). Proxy to a second process that does, e.g.:
//   Terminal A: npx vercel dev --listen 3000
//   Terminal B: npm run dev   → browser http://localhost:5173, /api → 3000
export default defineConfig(({ mode }) => {
  // loadEnv merges .env, .env.local, .env.[mode], .env.[mode].local so that
  // VITE_DEV_API_PROXY can be overridden from any of those files.
  const env = loadEnv(mode, process.cwd(), '')
  const devApiProxyTarget = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:3000'

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: devApiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  build: {
    chunkSizeWarningLimit: 600, // Increased from default 500 kB to account for large app bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-error-boundary'],
          // Split UI component libraries
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          // Split icon libraries
          'icons': ['@phosphor-icons/react', '@heroicons/react', 'lucide-react'],
          // Split form and utility libraries
          'utils': ['framer-motion', '@tanstack/react-query', 'date-fns'],
        },
      },
    },
  },
  };
});
