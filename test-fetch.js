async function run() {
  const res = await fetch('http://localhost:3000/api/email/sync', { method: 'POST' });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
run();
