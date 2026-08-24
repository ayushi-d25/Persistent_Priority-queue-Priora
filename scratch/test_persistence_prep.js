const http = require('http');
const fs = require('fs');
const path = require('path');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Populating data for persistence test...');
  await request('POST', '/api/queue', { value: 'Persistent Task Alpha', priority: 2 });
  await request('POST', '/api/queue', { value: 'Persistent Task Beta', priority: 8 });

  const before = await request('GET', '/api/queue');
  console.log('Data before server restart:');
  console.log(JSON.stringify(before.data.data.items, null, 2));
}

run().catch(console.error);
