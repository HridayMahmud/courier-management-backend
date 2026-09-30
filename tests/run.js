// npm test: starts a throwaway MongoDB and API server, runs every tests/*.test.js file, then cleans up.
// Nothing touches your real database or .env.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG = path.join(os.tmpdir(), `courier-api-test-${process.pid}.log`);

const freePort = () =>
  new Promise((resolve) => {
    const srv = net.createServer().listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

async function startServer(env) {
  const port = await freePort();
  const out = fs.openSync(LOG, 'a');
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, MAIL_TRANSPORT: 'console', ...env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', out, out],
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`server exited early, see ${LOG}`);
    try {
      if ((await fetch(url + '/')).ok) return { child, url };
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}

function runFile(file, env) {
  const res = spawnSync(process.execPath, [path.join(__dirname, file)], { env: { ...process.env, ...env }, encoding: 'utf8' });
  process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  const m = res.stdout.match(/(\d+) passed, (\d+) failed/);
  return m ? { passed: +m[1], failed: +m[2] } : { passed: 0, failed: 1 };
}

(async () => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'courier_test', launchTimeout: 120000 } });
  const MONGODB_URI = mongo.getUri('courier_test');
  const base = { MONGODB_URI, JWT_SECRET: crypto.randomBytes(24).toString('hex') };
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort();
  const totals = { passed: 0, failed: 0 };
  let server;
  try {
    // each group gets its own server: most files run with rate limits off and console email,
    // files named *rate-limit* with limits on, files named *mail-off* with email switched off
    const groups = [
      { match: (f) => !f.includes('rate-limit') && !f.includes('mail-off'), env: { RATE_LIMIT: 'off' } },
      { match: (f) => f.includes('rate-limit'), env: { RATE_LIMIT: 'on' } },
      { match: (f) => f.includes('mail-off'), env: { RATE_LIMIT: 'off', MAIL_TRANSPORT: 'off' } },
    ];
    for (const group of groups) {
      const groupFiles = files.filter(group.match);
      if (!groupFiles.length) continue;
      server = await startServer({ ...base, ...group.env });
      const env = { TEST_BASE_URL: server.url, TEST_MONGO_URI: MONGODB_URI, TEST_SERVER_LOG: LOG };
      for (const f of groupFiles) {
        const r = runFile(f, env);
        totals.passed += r.passed;
        totals.failed += r.failed;
      }
      server.child.kill();
      server = null;
    }
  } finally {
    server?.child.kill();
    await mongo.stop();
    fs.rmSync(LOG, { force: true });
  }
  console.log(`\nTOTAL: ${totals.passed} passed, ${totals.failed} failed`);
  process.exit(totals.failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
