import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('mermaid')) return 'vendor-mermaid';
          if (id.includes('cytoscape')) return 'vendor-cytoscape';
          if (id.includes('katex')) return 'vendor-katex';
          if (id.includes('react-markdown') || id.includes('remark-gfm')) {
            return 'vendor-markdown';
          }
          if (id.includes('radix-ui') || id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('react-router-dom')) return 'vendor-router';
          if (id.includes('react') || id.includes('react-dom'))
            return 'vendor-react';
        },
      },
    },
  },
});
