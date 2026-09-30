const { api, check, makeUser, uid, done } = require('./lib');

(async () => {
  console.log('Commit 4: new endpoints');
  const cust = await makeUser('customer');
  const other = await makeUser('customer');
  const admin = await makeUser('admin');

  // /me
  let r = await api('GET', '/api/auth/me', { token: cust.token });
  check('/me returns profile without password', r.status === 200 && r.data.user?.email === cust.email && !('password' in r.data.user), r);
  r = await api('GET', '/api/auth/me');
  check('/me without token -> 401', r.status === 401, r);

  // admin creates couriers
  const cEmail = `courier_${uid()}@test.com`;
  r = await api('POST', '/api/users/courier', { token: admin.token, body: { name: 'Courier One', email: cEmail, password: 'pass1234' } });
  check('admin creates courier -> 201', r.status === 201 && r.data.user?.role === 'courier' && !('password' in r.data.user), r);
  const courierId = r.data.user?._id;
  r = await api('POST', '/api/users/courier', { token: admin.token, body: { name: 'Dup', email: cEmail, password: 'pass1234' } });
  check('duplicate courier email -> 400', r.status === 400, r);
  r = await api('POST', '/api/users/courier', { token: cust.token, body: { name: 'x', email: `x${uid()}@t.com`, password: 'pass1234' } });
  check('customer cannot create courier -> 403', r.status === 403, r);
  const courier = { token: (await api('POST', '/api/auth/login', { body: { email: cEmail, password: 'pass1234' } })).data.token };
  const other2 = await makeUser('courier');

  // customer creates parcel
  r = await api('POST', '/api/parcel/create-parcel', { token: cust.token, body: {
    title: 'Phone', address: 'Mirpur 10, Dhaka', pickupAddress: 'Gulshan 1, Dhaka', receiverName: 'Sadia', receiverPhone: '01811111111', weight: 0.5 } });
  const parcel = r.data.parcel;
  const pid = parcel._id;

  // details access
  r = await api('GET', `/api/parcel/${pid}`, { token: cust.token });
  check('owner can view details (populated)', r.status === 200 && r.data.userId?.email === cust.email, r);
  r = await api('GET', `/api/parcel/${pid}`, { token: other.token });
  check('other customer cannot view -> 403', r.status === 403, r);
  r = await api('GET', `/api/parcel/${pid}`, { token: courier.token });
  check('unassigned courier cannot view -> 403', r.status === 403, r);
  r = await api('GET', `/api/parcel/000000000000000000000000`, { token: admin.token });
  check('missing parcel -> 404', r.status === 404, r);

  // public tracking
  r = await api('GET', `/api/parcel/track/${parcel.trackingId.toLowerCase()}`);
  check('public track works (case-insensitive)', r.status === 200 && r.data.trackingId === parcel.trackingId && r.data.status === 'pending', r);
  check('public track hides addresses/phone/names', !('address' in r.data) && !('receiverPhone' in r.data) && !('receiverName' in r.data) && !('userId' in r.data) && !('updatedBy' in (r.data.statusHistory?.[0] || {})), r.data);
  r = await api('GET', `/api/parcel/track/SS-NOTEXIST`);
  check('unknown tracking id -> 404', r.status === 404, r);

  // assign
  r = await api('PATCH', `/api/parcel/${pid}/assign`, { token: admin.token, body: { courierId: cust.id } });
  check('assigning a non-courier -> 400', r.status === 400, r);
  r = await api('PATCH', `/api/parcel/${pid}/assign`, { token: cust.token, body: { courierId } });
  check('customer cannot assign -> 403', r.status === 403, r);
  r = await api('PATCH', `/api/parcel/${pid}/assign`, { token: admin.token, body: { courierId } });
  check('admin assigns courier', r.status === 200 && r.data.parcel?.assignedCourier?._id === courierId, r);

  r = await api('GET', '/api/parcel/courier/assigned', { token: courier.token });
  check('courier sees assigned parcel', r.status === 200 && r.data.length === 1 && r.data[0]._id === pid, r);
  r = await api('GET', '/api/parcel/courier/assigned', { token: other2.token });
  check('other courier sees nothing', r.status === 200 && r.data.length === 0, r);
  r = await api('GET', '/api/parcel/courier/assigned', { token: cust.token });
  check('customer cannot use courier list -> 403', r.status === 403, r);
  r = await api('GET', `/api/parcel/${pid}`, { token: courier.token });
  check('assigned courier can view details', r.status === 200, r);

  // status flow
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: other2.token, body: { status: 'picked_up' } });
  check('unassigned courier cannot update status -> 403', r.status === 403, r);
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: cust.token, body: { status: 'delivered' } });
  check('customer cannot update status -> 403', r.status === 403, r);
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: courier.token, body: { status: 'flying' } });
  check('invalid status -> 400', r.status === 400, r);
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: courier.token, body: { status: 'picked_up', note: 'Picked from Gulshan' } });
  check('courier: pending -> picked_up', r.status === 200 && r.data.parcel.status === 'picked_up', r);
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: courier.token, body: { status: 'pending' } });
  check('courier cannot move backward -> 400', r.status === 400, r);
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: courier.token, body: { status: 'cancelled' } });
  check('courier cannot cancel -> 400', r.status === 400, r);
  r = await api('PATCH', `/api/parcel/${pid}/cancel`, { token: cust.token });
  check('customer cannot cancel after pickup -> 400', r.status === 400, r);
  for (const s of ['in_transit', 'out_for_delivery', 'delivered']) {
    r = await api('PATCH', `/api/parcel/${pid}/status`, { token: courier.token, body: { status: s } });
    check(`courier -> ${s}`, r.status === 200 && r.data.parcel.status === s, r);
  }
  r = await api('PATCH', `/api/parcel/${pid}/status`, { token: courier.token, body: { status: 'delivered' } });
  check('courier cannot change delivered parcel -> 400', r.status === 400, r);
  r = await api('PATCH', `/api/parcel/${pid}/assign`, { token: admin.token, body: { courierId: null } });
  check('cannot reassign delivered parcel -> 400', r.status === 400, r);

  r = await api('GET', `/api/parcel/track/${parcel.trackingId}`);
  const hist = r.data.statusHistory || [];
  check('tracking timeline has all 5 steps in order',
    hist.map((h) => h.status).join(',') === 'pending,picked_up,in_transit,out_for_delivery,delivered', hist);
  check('timeline keeps courier note', hist[1]?.note === 'Picked from Gulshan', hist[1]);

  // customer cancel
  r = await api('POST', '/api/parcel/create-parcel', { token: cust.token, body: { title: 'Books', address: 'Uttara, Dhaka', weight: 3 } });
  const p2 = r.data.parcel._id;
  r = await api('PATCH', `/api/parcel/${p2}/cancel`, { token: other.token });
  check('other customer cannot cancel -> 403', r.status === 403, r);
  r = await api('PATCH', `/api/parcel/${p2}/cancel`, { token: cust.token, body: { reason: 'Changed my mind' } });
  check('owner cancels pending parcel', r.status === 200 && r.data.parcel.status === 'cancelled' && r.data.parcel.statusHistory.at(-1).note === 'Changed my mind', r);
  r = await api('PATCH', `/api/parcel/${p2}/assign`, { token: admin.token, body: { courierId } });
  check('cannot assign cancelled parcel -> 400', r.status === 400, r);

  // admin can set any status, including cancel
  r = await api('POST', '/api/parcel/create-parcel', { token: cust.token, body: { title: 'Shoes', address: 'Banani, Dhaka', receiverName: 'Nabil', weight: 1 } });
  const p3 = r.data.parcel._id;
  r = await api('PATCH', `/api/parcel/${p3}/status`, { token: admin.token, body: { status: 'in_transit' } });
  check('admin can jump status', r.status === 200, r);
  r = await api('PATCH', `/api/parcel/${p3}/status`, { token: admin.token, body: { status: 'in_transit' } });
  check('same status again -> 400', r.status === 400, r);

  // admin list: pagination, filter, search
  r = await api('GET', '/api/parcel/getall-parcels?page=1&limit=2', { token: admin.token });
  check('getall paginated shape', r.status === 200 && Array.isArray(r.data.items) && r.data.items.length === 2 && r.data.total >= 3 && r.data.pages >= 2, r.data);
  r = await api('GET', '/api/parcel/getall-parcels?status=delivered&limit=50', { token: admin.token });
  check('getall status filter', r.status === 200 && r.data.items.length >= 1 && r.data.items.every((p) => p.status === 'delivered'), r.data);
  r = await api('GET', `/api/parcel/getall-parcels?search=${parcel.trackingId}`, { token: admin.token });
  check('getall search by trackingId', r.data.items?.length === 1 && r.data.items[0]._id === pid, r.data);
  r = await api('GET', '/api/parcel/getall-parcels?search=nabil', { token: admin.token });
  check('getall search by receiver (case-insensitive)', r.data.items?.some((p) => p._id === p3), r.data);
  r = await api('GET', '/api/parcel/getall-parcels?search=(((', { token: admin.token });
  check('regex characters in search do not crash', r.status === 200, r);
  r = await api('GET', '/api/parcel/getall-parcels?status=bogus', { token: admin.token });
  check('getall invalid status -> 400', r.status === 400, r);
  r = await api('GET', '/api/parcel/getall-parcels', { token: admin.token });
  check('getall without query still returns array', Array.isArray(r.data), typeof r.data);

  // stats
  r = await api('GET', '/api/parcel/stats', { token: admin.token });
  const st = r.data;
  check('stats shape', r.status === 200 && typeof st.total === 'number' && st.byStatus && st.daily?.length === 30 && st.users && st.recent?.length <= 5, st);
  check('stats counts add up', Object.values(st.byStatus || {}).reduce((a, b) => a + b, 0) === st.total, st.byStatus);
  check('stats today has parcels', st.daily?.at(-1)?.count >= 3, st.daily?.at(-1));
  r = await api('GET', '/api/parcel/stats', { token: cust.token });
  check('stats for customer -> 403', r.status === 403, r);

  // users list
  r = await api('GET', '/api/users?role=courier', { token: admin.token });
  const c1 = Array.isArray(r.data) && r.data.find((u) => u._id === courierId);
  check('courier list with activeParcels', r.status === 200 && c1 && c1.activeParcels === 0 && !('password' in c1), r.data);
  r = await api('GET', '/api/users', { token: admin.token });
  check('all users list', r.status === 200 && r.data.length >= 4, r.data.length);
  r = await api('GET', '/api/users', { token: cust.token });
  check('users list for customer -> 403', r.status === 403, r);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
