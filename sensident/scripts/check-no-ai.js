/**
 * No-AI Guard — Script CI qui bloque tout import / dépendance IA
 *
 * Lancé en pre-commit et en CI. Si une dépendance interdite est détectée,
 * le script sort en erreur 1.
 *
 * Règle absolue : pas d'API LLM, pas d'embedding, pas de ML au runtime.
 */
const fs = require('fs');
const path = require('path');

const FORBIDDEN_PACKAGES = [
  // SDK officiels
  'openai',
  'openai-edge',
  'anthropic',
  '@anthropic-ai/sdk',
  '@mistralai/mistralai',
  'cohere-ai',
  'cohere',
  'google-cloud-aiplatform',
  '@google-cloud/vertexai',
  '@aws-sdk/client-bedrock-runtime',
  '@azure/openai',
  // Wrappers / frameworks
  'langchain',
  '@langchain/core',
  '@langchain/openai',
  '@langchain/anthropic',
  'llamaindex',
  'ai',                  // Vercel AI SDK
  '@vercel/ai',
  // Embeddings / vector stores
  'pinecone-client',
  '@pinecone-database/pinecone',
  'weaviate-ts-client',
  'qdrant-js',
  'chroma-js',
  // Moderation APIs
  'openai-moderation',
];

const FORBIDDEN_IMPORTS = [
  'openai',
  'anthropic',
  '@mistralai',
  'cohere-ai',
  'langchain',
  'llamaindex',
  '@pinecone',
  'weaviate',
  'qdrant',
  '@vercel/ai',
  'vertexai',
];

const FORBIDDEN_URLS = [
  'api.openai.com',
  'api.anthropic.com',
  'api.mistral.ai',
  'api.cohere.ai',
  'generativelanguage.googleapis.com',
  'bedrock-runtime.amazonaws.com',
];

let errors = 0;

// 1. Verifier package.json
const pkgPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const forbidden of FORBIDDEN_PACKAGES) {
    if (allDeps[forbidden]) {
      console.error(`❌ Dependance interdite detectee dans package.json : ${forbidden}`);
      errors++;
    }
  }
}

// 2. Verifier le code source (imports)
const srcDirs = ['src', 'app', 'pages', 'components', 'lib'];
for (const dir of srcDirs) {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) continue;
  walk(full, (file) => {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) return;
    if (file.includes('check-no-ai')) return;
    const content = fs.readFileSync(file, 'utf8');
    for (const forbidden of FORBIDDEN_IMPORTS) {
      const regex = new RegExp(`(import|require|from)\\s*[\(\'\"]${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      if (regex.test(content)) {
        console.error(`❌ Import interdit dans ${path.relative(process.cwd(), file)} : ${forbidden}`);
        errors++;
      }
    }
    for (const url of FORBIDDEN_URLS) {
      if (content.includes(url)) {
        console.error(`❌ URL interdite dans ${path.relative(process.cwd(), file)} : ${url}`);
        errors++;
      }
    }
  });
}

// 3. Verifier pnpm-lock.yaml / package-lock.json
const lockFiles = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'];
for (const lock of lockFiles) {
  const full = path.join(process.cwd(), lock);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  for (const forbidden of FORBIDDEN_PACKAGES) {
    // Match le nom du package comme mot (evite faux positifs)
    const regex = new RegExp(`[\'\"\\s>~]${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s:'\"]`, 'g');
    if (regex.test(content)) {
      console.error(`❌ Dependance interdite detectee dans ${lock} : ${forbidden}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n🚫 No-AI guard : ${errors} violation(s) detectee(s).`);
  console.error('Sensident fonctionne SANS AUCUNE INTELLIGENCE ARTIFICIELLE au runtime.');
  process.exit(1);
}

console.log('✅ No-AI guard : OK (aucune dependance IA detectee).');

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      walk(full, fn);
    } else {
      fn(full);
    }
  }
}
