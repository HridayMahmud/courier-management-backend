const { api, check, makeUser, done } = require('./lib');

(async () => {
  console.log('Account: profile name + change password');
  const u = await makeUser('customer');

  let r = await api('PATCH', '/api/auth/me', { body: { name: 'New Name' } });
  check('update name without token -> 401', r.status === 401, r);
  r = await api('PATCH', '/api/auth/me', { token: u.token, body: { name: ' x ' } });
  check('too short name -> 400', r.status === 400, r);
  r = await api('PATCH', '/api/auth/me', { token: u.token, body: { name: '  Rahima Khatun  ' } });
  check('update name -> 200, trimmed', r.status === 200 && r.data.user?.name === 'Rahima Khatun', r);
  check('profile response has no password', r.data.user && !('password' in r.data.user), r.data);
  r = await api('GET', '/api/auth/me', { token: u.token });
  check('/me shows new name', r.data.user?.name === 'Rahima Khatun', r.data);

  r = await api('PATCH', '/api/auth/password', { body: { currentPassword: u.password, newPassword: 'another1' } });
  check('change password without token -> 401', r.status === 401, r);
  r = await api('PATCH', '/api/auth/password', { token: u.token, body: { currentPassword: 'wrong-one', newPassword: 'another1' } });
  check('wrong current password -> 400', r.status === 400 && /incorrect/i.test(r.data.message), r);
  r = await api('PATCH', '/api/auth/password', { token: u.token, body: { currentPassword: u.password, newPassword: '123' } });
  check('short new password -> 400', r.status === 400, r);
  r = await api('PATCH', '/api/auth/password', { token: u.token, body: { currentPassword: u.password, newPassword: u.password } });
  check('same password -> 400', r.status === 400, r);
  r = await api('PATCH', '/api/auth/password', { token: u.token, body: { currentPassword: u.password } });
  check('missing new password -> 400', r.status === 400, r);
  r = await api('PATCH', '/api/auth/password', { token: u.token, body: { currentPassword: u.password, newPassword: 'Changed#2026' } });
  check('change password -> 200', r.status === 200, r);

  r = await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
  check('old password no longer works', r.status === 401, r);
  r = await api('POST', '/api/auth/login', { body: { email: u.email, password: 'Changed#2026' } });
  check('new password works', r.status === 200 && r.data.token, r);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
