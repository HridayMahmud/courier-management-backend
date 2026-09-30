// Runs against a server started WITH rate limits (run.js restarts it for this file).
const { api, check, done } = require('./lib');

(async () => {
  console.log('Rate limits');
  const creds = { email: 'nobody@test.com', password: 'wrong-pass' };

  let last;
  for (let i = 0; i < 10; i++) last = await api('POST', '/api/auth/login', { body: creds });
  check('first 10 login attempts are answered normally', last.status === 404, last);
  check('rate limit headers present', !!(await fetch(process.env.TEST_BASE_URL + '/api/auth/login', { method: 'POST' })).headers.get('ratelimit'));
  const blocked = await api('POST', '/api/auth/login', { body: creds });
  check('12th login attempt -> 429', blocked.status === 429, blocked);
  check('429 has a readable message', /too many login attempts/i.test(blocked.data?.message || ''), blocked.data);

  for (let i = 0; i < 5; i++) last = await api('POST', '/api/auth/forgot-password', { body: { email: 'nobody@test.com' } });
  check('first 5 reset requests answered normally', last.status === 404, last);
  const resetBlocked = await api('POST', '/api/auth/forgot-password', { body: { email: 'nobody@test.com' } });
  check('6th reset request -> 429', resetBlocked.status === 429, resetBlocked);

  const other = await api('GET', '/api/parcel/track/SS-NOPE0000');
  check('other endpoints are not limited', other.status === 404, other);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
