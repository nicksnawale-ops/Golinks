import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

/**
 * The browser demo backend (src/demo) runs the real server link logic from /server/services.
 * In the client bundle, those files' repository imports are swapped for the localStorage-backed
 * versions in src/demo/repositories. The Node server build
 * (esbuild, npm run build:server) is not affected.
 */
function browserRepositories(): Plugin {
  const demoRepos = path.resolve(__dirname, 'src/demo/repositories');
  const serverDir = path.resolve(__dirname, 'server') + path.sep;
  return {
    name: 'golinks-browser-repositories',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !path.resolve(importer).startsWith(serverDir)) return null;
      const repo = /^\.\.\/repositories\/(\w+)$/.exec(source);
      if (repo) return path.join(demoRepos, `${repo[1]}.ts`);
      return null;
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // In development the Express API runs separately (npm run dev:server); proxy /api to it.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

  return {
    plugins: [browserRepositories(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Keep the browser's Host header: the API's same-origin (CSRF) check compares it with Origin.
        '/api': {target: apiTarget, changeOrigin: false},
      },
    },
  };
});
