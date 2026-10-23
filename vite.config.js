import { defineConfig } from 'vite';
import { cpSync } from 'fs';

export default defineConfig({
  base: '/App-Usar-Veneto/',
  plugins: [{
    name: 'copia-statici',
    closeBundle() {
      cpSync('index-extra', 'dist', { recursive: true });
    }
  }]
});
