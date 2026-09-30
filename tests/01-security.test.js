const { api, check, db, makeUser, uid, done } = require('./lib');

(async () => {
  console.log('Commit 1: security');

  // register tries to become admin
  const email = `hacker_${uid()}@test.com`;
  const reg = await api('POST', '/api/auth/register', { body: { name: 'Hacker', email, password: 'x12345', role: 'admin' } });
  check('register ignores role=admin', reg.data.User?.role === 'customer', reg.data);
  check('register response has no password', reg.data.User && !('password' in reg.data.User), reg.data);
  check('register response has no resetToken', reg.data.User && !('resetToken' in reg.data.User), reg.data);

  const a = await makeUser('customer');
  const b = await makeUser('customer');
  const admin = await makeUser('admin');

  // create a parcel for customer A (old API still takes userId from body at this point)
  await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'A box', address: 'Dhaka', weight: '2', userId: a.id } });
  const parcel = await (await db()).collection('parcels').findOne({ title: 'A box' });
  const pid = String(parcel._id);

  let r = await api('PUT', `/api/parcel/update-parcel/${pid}`, { body: { title: 'x' } });
  check('update without token -> 401', r.status === 401, r);
  r = await api('DELETE', `/api/parcel/delete-parcel/${pid}`);
  check('delete without token -> 401', r.status === 401, r);

  r = await api('PUT', `/api/parcel/update-parcel/${pid}`, { token: b.token, body: { title: 'x' } });
  check("other customer update -> 403", r.status === 403, r);
  r = await api('DELETE', `/api/parcel/delete-parcel/${pid}`, { token: b.token });
  check("other customer delete -> 403", r.status === 403, r);

  r = await api('PUT', `/api/parcel/update-parcel/${pid}`, { token: a.token, body: { title: 'A box 2', address: 'Dhaka', weight: '3' } });
  check('owner update -> 200', r.status === 200 && r.data.parcel?.title === 'A box 2', r);
  r = await api('PUT', `/api/parcel/update-parcel/${pid}`, { token: admin.token, body: { title: 'A box 3', address: 'Dhaka', weight: '3' } });
  check('admin update -> 200', r.status === 200 && r.data.parcel?.title === 'A box 3', r);
  r = await api('PUT', `/api/parcel/update-parcel/000000000000000000000000`, { token: admin.token, body: { title: 'x' } });
  check('update missing parcel -> 404', r.status === 404, r);

  r = await api('DELETE', `/api/parcel/delete-parcel/${pid}`, { token: a.token });
  check('owner delete -> 200', r.status === 200, r);

  // reset token: hashed + expiry
  r = await api('POST', '/api/auth/forgot-password', { body: { email: a.email } });
  const u = await (await db()).collection('users').findOne({ email: a.email });
  check('reset token stored as sha256 hash', /^[a-f0-9]{64}$/.test(u.resetToken || ''), u.resetToken);
  const mins = (u.resetTokenExpires - Date.now()) / 60000;
  check('reset token expires in ~15 min', mins > 14 && mins <= 15, mins);

  r = await api('POST', '/api/auth/reset-password', { body: { email: a.email, token: u.resetToken, password: 'new12345' } });
  check('using the stored hash as token fails', r.status === 403, r);

  // expired token: put a known token hash with past expiry
  const crypto = require('crypto');
  const raw = 'abc123';
  await (await db()).collection('users').updateOne({ email: a.email }, { $set: {
    resetToken: crypto.createHash('sha256').update(raw).digest('hex'), resetTokenExpires: new Date(Date.now() - 1000) } });
  r = await api('POST', '/api/auth/reset-password', { body: { email: a.email, token: raw, password: 'new12345' } });
  check('expired token -> 400', r.status === 400, r);

  await (await db()).collection('users').updateOne({ email: a.email }, { $set: { resetTokenExpires: new Date(Date.now() + 60000) } });
  r = await api('POST', '/api/auth/reset-password', { body: { email: a.email, token: raw, password: 'new12345' } });
  check('valid token -> reset ok', r.status === 200, r);
  r = await api('POST', '/api/auth/login', { body: { email: a.email, password: 'new12345' } });
  check('login with new password', r.status === 200 && r.data.token, r);
  r = await api('POST', '/api/auth/reset-password', { body: { email: a.email, token: raw, password: 'again123' } });
  check('token cannot be reused', r.status === 400 || r.status === 403, r);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
