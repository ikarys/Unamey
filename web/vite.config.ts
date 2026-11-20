import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The backend compiles before it listens: until then the proxy answers 503 with a readable reason instead of a bare 502.
const backend: ProxyOptions = {
  target: 'http://127.0.0.1:7700',
  configure: (proxy) =>
    proxy.on('error', (err, _req, res) => {
      if ('writeHead' in res && !res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end(`backend not reachable on 127.0.0.1:7700 (${err.message}); still compiling? reload in a minute`);
      }
    }),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180, strictPort: true, proxy: { '/api': backend, '^/s/': backend } },
  build: { outDir: 'dist' }
});
