const { api, check, db, makeUser, done } = require('./lib');
const fs = require('fs');

(async () => {
  console.log('Commit 2: bug fixes');
  const a = await makeUser('customer');
  const b = await makeUser('customer');
  const admin = await makeUser('admin');

  // userId comes from token, body userId is ignored
  let r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'P1', address: 'Dhaka', weight: '1', userId: b.id } });
  check('create -> 201 with parcel object', r.status === 201 && r.data.parcel?._id, r);
  check('owner taken from token, not body', r.data.parcel?.userId === a.id, r.data.parcel);
  await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'P2', address: 'Khulna', weight: '2' } });
  await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'P3', address: 'Sylhet', weight: '3' } });

  r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'P2', address: 'Khulna', weight: '2' } });
  check('duplicate of a non-first parcel is blocked', r.status === 400, r);
  r = await api('POST', '/api/parcel/create-parcel', { token: b.token, body: { title: 'P2', address: 'Khulna', weight: '2' } });
  check('same parcel for another user is allowed', r.status === 201, r);

  r = await api('GET', '/api/parcel/user-parcel', { token: a.token });
  check('user-parcel returns all 3 parcels', Array.isArray(r.data) && r.data.length === 3, r.data);
  check('user-parcel newest first', r.data[0]?.title === 'P3', r.data.map?.((p) => p.title));
  r = await api('GET', '/api/parcel/user-parcel', { token: b.token });
  check("user-parcel only shows own parcels", r.data.length === 1, r.data);

  r = await api('GET', '/api/parcel/getall-parcels', { token: admin.token });
  const total = await (await db()).collection('parcels').countDocuments();
  check('getall returns every parcel', r.data.length === total, [r.data.length, total]);
  check('getall populates customer name/email', r.data[0]?.userId?.email, r.data[0]);
  r = await api('GET', '/api/parcel/getall-parcels', { token: a.token });
  check('getall for customer -> 403', r.status === 403, r);

  // i18n
  r = await api('POST', '/api/auth/login', { body: { email: a.email, password: a.password } });
  check('login message is real text, not key', r.data.message === 'Login successful', r.data.message);
  r = await api('POST', '/api/auth/login', { body: { email: a.email, password: a.password }, headers: { 'Accept-Language': 'bn' } });
  check('login message in Bangla', r.data.message === 'লগইন সফল', r.data.message);
  r = await api('GET', '/api/parcel/user-parcel');
  check('no token message', r.status === 401 && r.data.message === 'No token provided', r.data);

  // status codes
  r = await api('POST', '/api/auth/login', { body: { email: a.email, password: 'wrong' } });
  check('wrong password -> 401', r.status === 401, r);
  r = await api('POST', '/api/auth/register', { body: { email: 'noname@test.com', password: 'x' } });
  check('register without name -> 400', r.status === 400, r);

  // forgot password through ethereal fake inbox
  r = await api('POST', '/api/auth/forgot-password', { body: { email: a.email } });
  check('forgot-password -> 200 (console mail)', r.status === 200 && r.data.message === 'email sent', r);
  await new Promise((s) => setTimeout(s, 500));
  const log = fs.readFileSync(process.env.TEST_SERVER_LOG, 'utf8');
  const m = log.match(/[email not sent, MAIL_TRANSPORT=console][sS]*?reset token:s*([a-f0-9]{40})/);
  check('reset email printed in server terminal', !!m, log.slice(-500));

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
