import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		// Tailwind v4 Vite plugin
		tailwind(),
		react(),
	],
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		'process.env': {},
		'process': { env: {} },
		'global': 'window',
	},
	build: {
		outDir: resolve(__dirname, '../media'),
		emptyOutDir: false,
		sourcemap: false,
		lib: {
			entry: resolve(__dirname, 'src/main.jsx'),
			name: 'WebviewApp',
			formats: ['iife'],
			fileName: () => 'webview.js'
		},
		rollupOptions: {
			output: {
				compact: true,
				assetFileNames: (assetInfo) => {
					const name = assetInfo.name || '';
					if (name.endsWith('.css')) {
						return 'webview.css';
					}
					return 'assets/[name][extname]';
				},
			}
		}
	}
});


