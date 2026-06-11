import { db, DB_DIALECT } from '../src/db/client';
const d = db as any;
console.log('dialect:', DB_DIALECT);
console.log('top-level keys:', Object.keys(d).slice(0, 30));
console.log('_.keys:', Object.keys(d._ ?? {}).slice(0, 30));
console.log('session keys:', Object.keys(d.session ?? d._?.session ?? {}).slice(0, 30));
const session = d._?.session ?? d.session;
if (session) {
  console.log('session prototype:', session.constructor?.name);
  console.log('session client type:', session.client?.constructor?.name ?? 'no client prop');
  console.log('session proto methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(session)).slice(0, 30));
}
process.exit(0);
