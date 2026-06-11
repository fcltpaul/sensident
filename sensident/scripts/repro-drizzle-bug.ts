/**
 * Reproduction Drizzle directe (pas postgres-js template).
 * Cible : confirmer que c'est bien Drizzle qui envoie un Number au lieu de Date.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.pg';

const url = process.env.DATABASE_URL!;
const client = postgres(url, { max: 1, connect_timeout: 10 });
const db = drizzle(client, { schema });

async function main() {
  // Cleanup
  await client`DELETE FROM practitioners WHERE email LIKE 'drizzle-test-%'`;

  // Cas 1 : Insert avec Date via Drizzle
  const cab = (await client`SELECT id FROM cabinets LIMIT 1`)[0];
  if (!cab) {
    console.log('No cabinet');
    return;
  }
  console.log('Cabinet:', cab.id);

  console.log('\n=== Insert via Drizzle avec Date ===');
  try {
    const [p] = await db.insert(schema.practitioners).values({
      cabinetId: cab.id,
      email: 'drizzle-test-1@x.fr',
      name: 'Test',
      passwordHash: 'x',
      totpSecret: null,
      totpEnabled: false,
      lastLoginAt: null,
      emailVerifiedAt: null,
    }).returning();
    console.log('OK:', p?.id);
  } catch (e: any) {
    console.log('FAIL:', e.message);
  }

  // Cas 2 : Insert avec Date.toISOString() (string)
  console.log('\n=== Insert via Drizzle avec string ISO ===');
  try {
    const [p] = await db.insert(schema.practitioners).values({
      cabinetId: cab.id,
      email: 'drizzle-test-2@x.fr',
      name: 'Test',
      passwordHash: 'x',
      totpSecret: null,
      totpEnabled: false,
      lastLoginAt: new Date().toISOString() as any,
      emailVerifiedAt: null,
    }).returning();
    console.log('OK:', p?.id);
  } catch (e: any) {
    console.log('FAIL:', e.message);
  }

  // Cas 3 : Insert avec undefined (Drizzle omet la colonne)
  console.log('\n=== Insert via Drizzle sans lastLoginAt (omet la colonne) ===');
  try {
    const [p] = await db.insert(schema.practitioners).values({
      cabinetId: cab.id,
      email: 'drizzle-test-3@x.fr',
      name: 'Test',
      passwordHash: 'x',
      totpSecret: null,
      totpEnabled: false,
    } as any).returning();
    console.log('OK:', p?.id);
  } catch (e: any) {
    console.log('FAIL:', e.message);
  }

  // Cleanup
  await client`DELETE FROM practitioners WHERE email LIKE 'drizzle-test-%'`;
  await client.end();
  console.log('\nDone.');
}

main();
