// Runs against a server started with MAIL_TRANSPORT=off (run.js restarts it for files named *mail-off*).
const { api, check, makeUser, done } = require('./lib');

(async () => {
  console.log('Email turned off');
  const u = await makeUser('customer');
  let r = await api('POST', '/api/auth/forgot-password', { body: { email: u.email } });
  check('forgot-password -> 503 with "contact the admin"', r.status === 503 && /contact the admin/i.test(r.data?.message || ''), r);
  r = await api('POST', '/api/auth/forgot-password', { body: { email: 'nobody@nowhere.test' } });
  check('same answer for unknown emails (no account probing)', r.status === 503, r);
  r = await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
  check('login still works', r.status === 200, r);
  await done();
})().catch((e) => { console.error(e); process.exit(1); });
