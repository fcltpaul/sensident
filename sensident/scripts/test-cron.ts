async function main() {
  const url = process.env.DATABASE_URL;
  console.log('DATABASE_URL:', url?.slice(0, 50));
  try {
    const r = await fetch('http://localhost:3001/api/cron/keep-alive');
    const text = await r.text();
    console.log('status:', r.status);
    console.log('body:', text);
  } catch (e: any) {
    console.log('FAIL:', e.message);
  }
}
main();
