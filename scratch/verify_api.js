const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
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

async function runVerification() {
  console.log('=== 1. Check Empty ===');
  console.log(await request('GET', '/api/queue/empty'));

  console.log('\n=== 2. Insert Item 1 (Priority 1) ===');
  const res1 = await request('POST', '/api/queue', { value: 'Fix production bug', priority: 1 });
  console.log(res1);

  console.log('\n=== 3. Insert Item 2 (Priority 5) ===');
  const res2 = await request('POST', '/api/queue', { value: 'Deploy frontend', priority: 5 });
  console.log(res2);

  console.log('\n=== 4. Insert Item 3 (Priority 10) ===');
  const res3 = await request('POST', '/api/queue', { value: 'Update docs', priority: 10 });
  console.log(res3);

  console.log('\n=== 5. Get All Queue Items ===');
  console.log(JSON.stringify(await request('GET', '/api/queue'), null, 2));

  console.log('\n=== 6. Peek Min Item ===');
  console.log(await request('GET', '/api/queue/peek'));

  console.log('\n=== 7. Update Item 3 Priority to 0 ===');
  const id3 = res3.data.data.id;
  console.log(await request('PUT', `/api/queue/${id3}`, { priority: 0 }));

  console.log('\n=== 8. Extract Min (should return Item 3 with priority 0) ===');
  console.log(await request('POST', '/api/queue/extract-min'));

  console.log('\n=== 9. Extract Max (should return Item 2 with priority 5) ===');
  console.log(await request('POST', '/api/queue/extract-max'));

  console.log('\n=== 10. Delete Item 1 ===');
  const id1 = res1.data.data.id;
  console.log(await request('DELETE', `/api/queue/${id1}`));

  console.log('\n=== 11. Final Empty Check ===');
  console.log(await request('GET', '/api/queue/empty'));
}

runVerification().catch(console.error);
