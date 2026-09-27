import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleSdk } from '@qvac/sdk/commands';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(appRoot, 'qvac.config.json');
const workerPath = path.join(appRoot, 'qvac', 'worker.entry.mjs');

await bundleSdk({ projectRoot: appRoot, configPath, quiet: true });
process.env.QVAC_CONFIG_PATH = configPath;
process.env.QVAC_WORKER_PATH = workerPath;
await import('./server.js');