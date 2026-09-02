async function showOauthPassword() {
  const tokenRes = await fetch('http://10.15.25.31:8088/api/panels/semit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await tokenRes.json();
  console.log('Token data:', Boolean(data.accessToken));
}

showOauthPassword().catch(console.error);
