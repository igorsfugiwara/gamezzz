import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Jogos do portal (PRD "Jogos do portal"): Vite + TypeScript em jogos/,
// compilados para public/games/portal/<jogo>/ antes do build do Next.
// O Next serve public/ como está; o GameFrame abre cada index.html num iframe.
const JOGOS = ['pixo', 'dobra', 'roda', 'faca'].filter((j) => existsSync(resolve(__dirname, `jogos/${j}/index.html`)));

export default defineConfig({
  root: resolve(__dirname, 'jogos'),
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'public/games/portal'),
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 8192,
    rollupOptions: {
      input: Object.fromEntries(
        JOGOS.map((j) => [j, resolve(__dirname, `jogos/${j}/index.html`)]),
      ),
    },
  },
  test: {
    root: resolve(__dirname, 'jogos'),
    environment: 'node',
  },
} as never);
