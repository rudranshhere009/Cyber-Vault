/* Simple test: POST /api/users then GET /api/users/:email */
(async () => {
  try {
    const base = 'http://localhost:3000';
    const payload = {
      username: 'biometric_test',
      email: 'biotest@example.com',
      passwordHash: 'testhash',
      salt: 'testsalt',
      neuralPin: '123',
      createdAt: new Date().toISOString(),
      faceDescriptor: Array.from({ length: 128 }, (_, i) => Math.random()),
      irisTemplate: Array.from({ length: 64 }, (_, i) => Math.floor(Math.random() * 256)),
      fingerprintEnabled: false
    };

    console.log('POST /api/users', payload.email);
    const p = await fetch(base + '/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('POST status', p.status);
    try { console.log('POST body', await p.text()); } catch {}

    console.log('GET /api/users/' + encodeURIComponent(payload.email));
    const g = await fetch(base + '/api/users/' + encodeURIComponent(payload.email));
    console.log('GET status', g.status);
    try { console.log('GET body', await g.text()); } catch {}

    process.exit(0);
  } catch (err) {
    console.error('Test failed', err);
    process.exit(2);
  }
})();
