// Demo-capture Vite config: serves the REAL Stylemax app from the repo, swapping only the
// network-bound service modules for in-memory mocks. Nothing under the repo's src/ is modified.
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const MOCKS = path.join(HERE, 'mocks');
const POPPINS = path.join(HERE, 'node_modules/@fontsource/poppins/files');

// Absolute source file -> mock file
const SWAPS: Record<string, string> = {
    'src/services/firebaseConfig.ts': 'firebaseConfig.ts',
    'src/services/firebaseEnvCheck.ts': 'firebaseEnvCheck.ts',
    'src/services/authService.ts': 'authService.ts',
    'src/services/firestoreService.ts': 'firestoreService.ts',
    'src/services/storageService.ts': 'storageService.ts',
    'src/services/aiProxyClient.ts': 'aiProxyClient.ts',
    'src/services/bedrockClient.ts': 'bedrockClient.ts',
    'src/services/weatherService.ts': 'weatherService.ts',
    'src/services/vision/providerRegistry.ts': 'providerRegistry.ts',
    'src/utils/firebaseProdVerification.ts': 'firebaseProdVerification.ts',
};
const SWAP_ABS = new Map(Object.entries(SWAPS).map(([k, v]) => [path.join(REPO, k), path.join(MOCKS, v)]));

function demoMocks(): Plugin {
    return {
        name: 'stylemax-demo-mocks',
        enforce: 'pre',
        async resolveId(source, importer, options) {
            if (!importer || importer.startsWith(MOCKS)) return null;
            const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
            if (!resolved) return null;
            const mock = SWAP_ABS.get(resolved.id.split('?')[0]);
            return mock ?? null;
        },
        transformIndexHtml(html) {
            // Strip the external Figma capture script; inject local Poppins (no external fonts).
            const faces = [300, 400, 500, 600, 700, 800].map((w) =>
                `@font-face{font-family:'Poppins';font-style:normal;font-weight:${w};font-display:block;src:url('/__demo-fonts/poppins-latin-${w}-normal.woff2') format('woff2');}`
            ).join('\n')
                // The app's intended brand font is Poppins (index.css :root), but Tailwind v4's
                // `font-sans` utility on the layout root resolves to the default system stack.
                // For the marketing capture we honor the intended Poppins.
                + `\n.font-sans{font-family:'Poppins',ui-sans-serif,system-ui,sans-serif !important;}`;
            return html
                .replace(/<script[^>]*mcp\.figma\.com[^>]*><\/script>/, '')
                .replace('</head>', `<style>${faces}</style>\n</head>`);
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = (req.url || '').split('?')[0];
                let file: string | null = null;
                let type = 'application/octet-stream';
                if (url.startsWith('/__demo-fonts/')) {
                    file = path.join(POPPINS, path.basename(url)); type = 'font/woff2';
                } else if (url.startsWith('/u/jiyae/closet/')) {
                    file = path.join(REPO, 'public/catalog-images', path.basename(url)); type = 'image/webp';
                }
                if (file && fs.existsSync(file)) {
                    res.setHeader('Content-Type', type);
                    res.setHeader('Cache-Control', 'max-age=3600');
                    fs.createReadStream(file).pipe(res);
                    return;
                }
                next();
            });
        },
    };
}

export default defineConfig({
    root: REPO,
    configFile: false as any,
    define: { global: 'window' },
    resolve: { alias: { './runtimeConfig': './runtimeConfig.browser' } },
    plugins: [demoMocks(), react()],
    server: { port: 5199, strictPort: true, host: '127.0.0.1', fs: { allow: [REPO, HERE] } },
    cacheDir: path.join(HERE, '.vite-cache'),
    logLevel: 'info',
});
