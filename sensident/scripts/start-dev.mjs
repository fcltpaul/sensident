/**
 * Sensident — Dev server launcher
 *
 * Trouve automatiquement un port libre, lance Next.js, affiche l'URL.
 * Évite les "port already in use" des sessions précédentes.
 */
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEFAULT_PORT = 3001;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(preferred) {
  if (await isPortFree(preferred)) return preferred;
  // Scan 10 ports from preferred+1
  for (let p = preferred + 1; p < preferred + 11; p++) {
    if (await isPortFree(p)) return p;
  }
  // Fallback: let OS assign
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

async function main() {
  const port = await findFreePort(DEFAULT_PORT);
  console.log(`\n  🦷 Sensident — démarrer sur http://localhost:${port}\n`);

  const child = spawn('npx.cmd', ['next', 'dev', '-p', String(port)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
