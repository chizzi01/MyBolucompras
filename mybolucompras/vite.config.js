import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Asegura rutas relativas
  build: {
    assetsDir: 'assets', // Define dónde se guardan los recursos estáticos
  },
});
