/**
 * Sensident — Backup Neon → Scaleway Object Storage
 *
 * Usage local :
 *   $env:DATABASE_URL="postgresql://..."
 *   $env:BACKUP_ENCRYPTION_KEY="xxx"
 *   $env:SCW_ACCESS_KEY="SCW..."
 *   $env:SCW_SECRET_KEY="xxx"
 *   $env:SCW_ENDPOINT="https://s3.fr-par.scw.cloud"
 *   $env:SCW_REGION="fr-par"
 *   tsx scripts/backup-db.ts
 *
 * En prod, ce script est appelé par .github/workflows/backup-db.yml.
 * En local, sert de smoke test.
 */
import postgres from 'postgres';
import { spawn } from 'node:child_process';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
  const scwKey = process.env.SCW_ACCESS_KEY;
  const scwSecret = process.env.SCW_SECRET_KEY;
  const scwEndpoint = process.env.SCW_ENDPOINT || 'https://s3.fr-par.scw.cloud';
  const scwRegion = process.env.SCW_REGION || 'fr-par';
  const bucket = process.env.SCW_BUCKET || 'sensident-backups';

  if (!dbUrl) { console.error('DATABASE_URL manquant'); process.exit(1); }
  if (!encryptionKey) { console.error('BACKUP_ENCRYPTION_KEY manquant'); process.exit(1); }
  if (!scwKey || !scwSecret) { console.error('SCW_ACCESS_KEY et SCW_SECRET_KEY requis'); process.exit(1); }

  // 1. Test connectivité DB
  console.log('Connexion à la BDD...');
  const sql = postgres(dbUrl, { max: 1, connect_timeout: 10 });
  const v = await sql`SELECT version()`;
  console.log('  OK:', (v[0] as any).version.slice(0, 60));

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15); // YYYYMMDD_HHMMSS
  const fileName = `sensident-backup-${timestamp}.sql.gz.enc`;
  const localFile = path.join(process.cwd(), 'tmp', fileName);
  await fs.mkdir(path.dirname(localFile), { recursive: true });

  // 2. pg_dump + gzip + openssl encrypt
  console.log(`Dump + chiffrement vers ${fileName}...`);
  await new Promise<void>((resolve, reject) => {
    const pgDump = spawn('pg_dump', [dbUrl], { stdio: ['ignore', 'pipe', 'inherit'] });
    const gzip = spawn('gzip', [], { stdio: ['pipe', 'pipe', 'inherit'] });
    const openssl = spawn('openssl', [
      'enc', '-aes-256-cbc', '-salt', '-pbkdf2',
      '-pass', `pass:${encryptionKey}`,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    pgDump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(openssl.stdin);
    const out = require('node:fs').createWriteStream(localFile);
    openssl.stdout.pipe(out);

    openssl.on('close', (code) => {
      pgDump.kill(); gzip.kill();
      code === 0 ? resolve() : reject(new Error(`openssl exited ${code}`));
    });
    pgDump.on('error', reject);
    gzip.on('error', reject);
    openssl.on('error', reject);
  });

  const stat = await fs.stat(localFile);
  console.log(`  Taille : ${(stat.size / 1024).toFixed(1)} KB`);

  // 3. Upload vers Scaleway
  console.log(`Upload vers s3://${bucket}/daily/${fileName}...`);
  const s3 = new S3Client({
    region: scwRegion,
    endpoint: scwEndpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: scwKey, secretAccessKey: scwSecret },
  });

  const body = createReadStream(localFile);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `daily/${fileName}`,
    Body: body as any,
    Metadata: {
      'backup-date': new Date().toISOString(),
      'encrypted': 'aes-256-cbc',
    },
  }));
  console.log('  Upload OK');

  // 4. Purge > 7 jours
  console.log('Purge des backups > 7 jours...');
  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'daily/' }));
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  let purged = 0;
  for (const obj of list.Contents || []) {
    if (!obj.Key || !obj.LastModified) continue;
    if (obj.LastModified < cutoff) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      console.log(`  Supprimé: ${obj.Key}`);
      purged++;
    }
  }
  console.log(`  ${purged} backup(s) purgé(s)`);

  // 5. Cleanup local
  await fs.unlink(localFile);
  await sql.end();
  console.log('\n✅ Backup terminé.');
}

main().catch((e) => { console.error(e); process.exit(1); });
