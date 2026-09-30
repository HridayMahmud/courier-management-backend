const { api, check, makeUser, done } = require('./lib');

(async () => {
  console.log('Admin: reset a user password');
  const admin = await makeUser('admin');
  const otherAdmin = await makeUser('admin');
  const customer = await makeUser('customer');
  const courier = await makeUser('courier');

  let r = await api('PATCH', '/api/users/password', { body: { email: customer.email, newPassword: 'Reset#2026' } });
  check('without token -> 401', r.status === 401, r);
  r = await api('PATCH', '/api/users/password', { token: customer.token, body: { email: courier.email, newPassword: 'Reset#2026' } });
  check('customer cannot reset -> 403', r.status === 403, r);
  r = await api('PATCH', '/api/users/password', { token: admin.token, body: { email: customer.email } });
  check('missing new password -> 400', r.status === 400, r);
  r = await api('PATCH', '/api/users/password', { token: admin.token, body: { email: customer.email, newPassword: '123' } });
  check('short password -> 400', r.status === 400, r);
  r = await api('PATCH', '/api/users/password', { token: admin.token, body: { email: 'nobody@nowhere.test', newPassword: 'Reset#2026' } });
  check('unknown email -> 404', r.status === 404, r);
  r = await api('PATCH', '/api/users/password', { token: admin.token, body: { email: otherAdmin.email, newPassword: 'Reset#2026' } });
  check("another admin's password cannot be reset -> 403", r.status === 403, r);

  r = await api('PATCH', '/api/users/password', { token: admin.token, body: { email: customer.email.toUpperCase(), newPassword: 'Reset#2026' } });
  check('admin resets customer (email any case) -> 200', r.status === 200 && r.data.user?.email === customer.email && !('password' in (r.data.user || {})), r);
  r = await api('POST', '/api/auth/login', { body: { email: customer.email, password: customer.password } });
  check('customer old password no longer works', r.status === 401, r);
  r = await api('POST', '/api/auth/login', { body: { email: customer.email, password: 'Reset#2026' } });
  check('customer signs in with the new password', r.status === 200, r);

  r = await api('PATCH', '/api/users/password', { token: admin.token, body: { email: courier.email, newPassword: 'Courier#2026' } });
  check('admin resets courier -> 200', r.status === 200, r);
  r = await api('POST', '/api/auth/login', { body: { email: courier.email, password: 'Courier#2026' } });
  check('courier signs in with the new password', r.status === 200 && r.data.user === 'courier', r);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
