import http from 'http';

const testEndpoint = (path, headers = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, rawBody: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
};

async function run() {
  console.log('--- Testing Phase 12 Production Readiness ---');
  let passed = 0;

  // 1. Health Check
  const health = await testEndpoint('/api/health');
  if (health.statusCode === 200 && health.body.status === 'ok') {
    console.log('✅ PASS: /api/health returned 200 OK with status: ok');
    passed++;
  } else {
    console.error('❌ FAIL: /api/health failed', health);
  }

  // 2. WebRTC ICE Servers Endpoint
  const ice = await testEndpoint('/api/webrtc/ice-servers');
  if (
    ice.statusCode === 200 &&
    ice.body.success === true &&
    Array.isArray(ice.body.iceServers) &&
    ice.body.iceServers.length > 0
  ) {
    console.log('✅ PASS: /api/webrtc/ice-servers returned STUN/TURN configuration safely');
    passed++;
  } else {
    console.error('❌ FAIL: /api/webrtc/ice-servers failed', ice);
  }

  // 3. Security Headers
  if (
    health.headers['x-content-type-options'] === 'nosniff' &&
    health.headers['x-frame-options'] === 'SAMEORIGIN'
  ) {
    console.log('✅ PASS: Security headers (nosniff, SAMEORIGIN) verified on responses');
    passed++;
  } else {
    console.error('❌ FAIL: Security headers missing', health.headers);
  }

  // 4. CORS Allowed Origins
  const corsTest = await testEndpoint('/api/health', { Origin: 'http://localhost:5173' });
  if (corsTest.headers['access-control-allow-origin'] === 'http://localhost:5173') {
    console.log('✅ PASS: CORS headers returned for valid client origin');
    passed++;
  } else {
    console.error('❌ FAIL: CORS headers missing for client origin', corsTest.headers);
  }

  console.log(`\n🎉 Phase 12 Verification: ${passed}/4 Checks Passed!`);
}

run().catch(console.error);
