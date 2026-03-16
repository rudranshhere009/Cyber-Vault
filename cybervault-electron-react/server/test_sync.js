/* Simple end-to-end test for device register -> commit -> changes
   Run with: node server/test_sync.js
*/
(async () => {
  try {
    const base = 'http://localhost:3000';

    console.log('-> Registering device');
    const regRes = await fetch(base + '/api/devices/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: 'dev-1', userEmail: 'test@example.com', name: 'phone' }),
    });
    console.log('REG status', regRes.status);
    const regText = await regRes.text();
    console.log('REG body', regText);
    let reg;
    try { reg = JSON.parse(regText); } catch (e) { console.error('REG parse error', e); }

    const token = reg?.device?.token;
    if (!token) throw new Error('no device token returned');
    console.log('TOKEN', token.slice(0, 24) + '...');

    console.log('-> Committing a file add');
    const commitRes = await fetch(base + '/api/sync/commit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': token },
      body: JSON.stringify({ changes: [{ type: 'file', action: 'add', email: 'test@example.com', file: { name: 'fileC.txt', dataId: 'd3', type: 'text/plain', size: 77 } }] }),
    });
    console.log('COMMIT status', commitRes.status);
    console.log('COMMIT body', await commitRes.text());

    console.log('-> Fetching changes since epoch');
    const since = new Date(0).toISOString();
    const changesRes = await fetch(base + '/api/sync/changes?since=' + encodeURIComponent(since) + '&limit=50', {
      headers: { 'x-device-token': token },
    });
    console.log('CHANGES status', changesRes.status);
    const changesText = await changesRes.text();
    try { console.log('CHANGES body', JSON.parse(changesText)); } catch { console.log('CHANGES text', changesText); }

    console.log('Test complete');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(2);
  }
})();
