const { MongoClient, ObjectId } = require('mongodb');
// Shared helpers for the API test files. tests/run.js starts a throwaway database + server
// and passes their addresses in TEST_BASE_URL / TEST_MONGO_URI.
const BASE = process.env.TEST_BASE_URL || 'http://localhost:4000';
let passed = 0, failed = 0;

async function api(method, url, { body, token, headers = {} } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS', name); }
  else { failed++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

let client;
async function db() {
  if (!client) {
    client = await MongoClient.connect(process.env.TEST_MONGO_URI);
  }
  return client.db();
}

const uid = () => Math.random().toString(36).slice(2, 8);

// register via API, then optionally force a role directly in the DB (admin/courier)
async function makeUser(role = 'customer') {
  const email = `${role}_${uid()}@test.com`;
  const password = 'pass1234';
  await api('POST', '/api/auth/register', { body: { name: `${role} ${uid()}`, email, password } });
  if (role !== 'customer') await (await db()).collection('users').updateOne({ email }, { $set: { role } });
  const login = await api('POST', '/api/auth/login', { body: { email, password } });
  const user = await (await db()).collection('users').findOne({ email });
  return { email, password, token: login.data.token, id: String(user._id) };
}

async function done() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (client) await client.close();
  process.exit(failed ? 1 : 0);
}

module.exports = { api, check, db, makeUser, uid, done, ObjectId };
