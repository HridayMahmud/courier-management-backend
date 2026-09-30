const { api, check, db, makeUser, done, ObjectId } = require('./lib');

(async () => {
  console.log('Commit 3: parcel model');
  const a = await makeUser('customer');
  const admin = await makeUser('admin');

  let r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: {
    title: 'Laptop', address: 'House 5, Dhanmondi, Dhaka', pickupAddress: 'Agrabad, Chattogram',
    receiverName: 'Rahim', receiverPhone: '01711111111', weight: '2.5' } });
  const p = r.data.parcel || {};
  check('create -> 201', r.status === 201, r);
  check('trackingId generated (SS-XXXXXXXX)', /^SS-[A-HJ-NP-Z2-9]{8}$/.test(p.trackingId || ''), p.trackingId);
  check('weight stored as number', p.weight === 2.5, p.weight);
  check('receiver + pickup saved', p.receiverName === 'Rahim' && p.receiverPhone === '01711111111' && p.pickupAddress === 'Agrabad, Chattogram', p);
  check('statusHistory has created entry', p.statusHistory?.length === 1 && p.statusHistory[0].status === 'pending' && p.statusHistory[0].updatedBy === a.id, p.statusHistory);
  check('assignedCourier null', p.assignedCourier === null, p.assignedCourier);

  r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'Bad', address: 'x', weight: 'abc' } });
  check('non-numeric weight -> 400', r.status === 400, r);
  r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'Neg', address: 'x', weight: -1 } });
  check('negative weight -> 400', r.status === 400, r);
  r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { address: 'x', weight: 1 } });
  check('missing title -> 400', r.status === 400, r);

  // old API body (title, address, weight) still works
  r = await api('POST', '/api/parcel/create-parcel', { token: a.token, body: { title: 'Old style', address: 'Rajshahi', weight: 1 } });
  check('old-style body still creates parcel', r.status === 201 && r.data.parcel?.trackingId, r);

  r = await api('PUT', `/api/parcel/update-parcel/${p._id}`, { token: a.token, body: { receiverName: 'Karim', weight: 3 } });
  check('pending: customer can update new fields', r.status === 200 && r.data.parcel.receiverName === 'Karim' && r.data.parcel.weight === 3 && r.data.parcel.title === 'Laptop', r);
  r = await api('PUT', `/api/parcel/update-parcel/${p._id}`, { token: a.token, body: { weight: -5 } });
  check('update runs validators (negative weight -> 400)', r.status === 400, r);

  await (await db()).collection('parcels').updateOne({ _id: new ObjectId(p._id) }, { $set: { status: 'in_transit' } });
  r = await api('PUT', `/api/parcel/update-parcel/${p._id}`, { token: a.token, body: { title: 'x' } });
  check('in transit: customer update -> 400', r.status === 400, r);
  r = await api('DELETE', `/api/parcel/delete-parcel/${p._id}`, { token: a.token });
  check('in transit: customer delete -> 400', r.status === 400, r);
  r = await api('PUT', `/api/parcel/update-parcel/${p._id}`, { token: admin.token, body: { title: 'Laptop (fragile)' } });
  check('in transit: admin update -> 200', r.status === 200, r);

  // legacy docs without trackingId must not clash on the unique index
  const col = (await db()).collection('parcels');
  await col.insertMany([
    { userId: new ObjectId(a.id), title: 'legacy1', address: 'a', weight: '2kg', status: 'pending' },
    { userId: new ObjectId(a.id), title: 'legacy2', address: 'b', weight: '1', status: 'pending' },
  ]);
  check('two legacy parcels without trackingId coexist', (await col.countDocuments({ trackingId: { $exists: false } })) === 2);
  r = await api('GET', '/api/parcel/user-parcel', { token: a.token });
  check('user-parcel still works with legacy data', r.status === 200 && r.data.length === 4, r);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
