process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testStatus() {
  const base = 'https://10.15.25.28';
  console.log('Testing admin dashboard login...');
  
  // Try logging in with the admin user
  const loginRes = await fetch(`${base}/api/admin/dashboard/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thaissa10.codonhodasilva@gmail.com', password: 'Admin@SEMIT#2026' })
  });
  console.log('Login status:', loginRes.status);
  const loginData = await loginRes.json();
  console.log('Login response:', loginData);
}

testStatus().catch(console.error);
