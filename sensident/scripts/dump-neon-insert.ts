import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.pg';

const url = process.env.DATABASE_URL!;
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

const insertCab = db.insert(schema.cabinets).values({ name: 'TestCab', slug: 'test-cab-' + Date.now() });
console.log('CABINETS SQL:', JSON.stringify((insertCab as any).toSQL(), null, 2));

const insertPrac = db.insert(schema.practitioners).values({
  cabinetId: '00000000-0000-0000-0000-000000000000' as any,
  email: 'test@x.fr',
  name: 'test',
  passwordHash: 'x',
  totpSecret: null,
  totpEnabled: false,
  lastLoginAt: null,
  emailVerifiedAt: null,
});
console.log('PRACT SQL:', JSON.stringify((insertPrac as any).toSQL(), null, 2));

client.end().then(() => process.exit(0));
