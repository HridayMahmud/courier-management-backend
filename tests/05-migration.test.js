// inserts old-style documents, runs the migration (dry run, real, again) and checks the result
const { check, db, done, ObjectId } = require('./lib');
const { execFileSync } = require('child_process');

const BACKEND = require('path').join(__dirname, '..');
const uri = process.env.TEST_MONGO_URI;
const runScript = (...args) => execFileSync(process.execPath, ['scripts/backfill-tracking-ids.js', ...args],
  { cwd: BACKEND, env: { ...process.env, MONGODB_URI: uri }, encoding: 'utf8' });

(async () => {
  console.log('Commit 5: migration');
  const d = await db();
  const parcels = d.collection('parcels');
  const users = d.collection('users');
  const uid = new ObjectId();
  const created = new Date('2025-01-15T10:00:00Z');
  const { insertedIds } = await parcels.insertMany([
    { userId: uid, title: 'old1', address: 'Dhaka', weight: '2kg', status: 'pending', createdAt: created, updatedAt: created },
    { userId: uid, title: 'old2', address: 'Khulna', weight: '1.5', createdAt: created, updatedAt: created },
    { userId: uid, title: 'old3', address: 'Sylhet', weight: 'heavy', status: 'pending', createdAt: created, updatedAt: created },
  ]);
  const ids = Object.values(insertedIds);
  await users.insertOne({ name: 'Old', email: `old_${Date.now()}@t.com`, password: 'x', role: 'customer', resetToken: 'plaintext123' });

  let out = runScript('--dry-run');
  console.log(out.trim().split('\n').map((l) => '    | ' + l).join('\n'));
  check('dry run reports changes', /would update [1-9]\d* parcel/.test(out), out);
  check('dry run changes nothing', (await parcels.findOne({ _id: ids[0] })).trackingId === undefined);

  out = runScript();
  console.log(out.trim().split('\n').map((l) => '    | ' + l).join('\n'));
  const [p1, p2, p3] = await Promise.all(ids.map((_id) => parcels.findOne({ _id })));
  check('trackingId added', [p1, p2, p3].every((p) => /^SS-[A-HJ-NP-Z2-9]{8}$/.test(p.trackingId)), [p1.trackingId, p2.trackingId]);
  check('tracking ids are unique', new Set([p1, p2, p3].map((p) => p.trackingId)).size === 3);
  check('"2kg" -> 2', p1.weight === 2, p1.weight);
  check('"1.5" -> 1.5', p2.weight === 1.5, p2.weight);
  check('"heavy" weight removed', !('weight' in p3), p3.weight);
  check('missing status -> pending', p2.status === 'pending', p2.status);
  check('statusHistory entry with original date', p1.statusHistory?.length === 1 && p1.statusHistory[0].at.getTime() === created.getTime(), p1.statusHistory);
  check('old plain reset token cleared', (await users.countDocuments({ resetToken: 'plaintext123' })) === 0);

  out = runScript();
  check('second run changes nothing', /updated 0 parcel/.test(out), out);
  check('trackingId stable on rerun', (await parcels.findOne({ _id: ids[0] })).trackingId === p1.trackingId);

  // migrated parcel is usable through the API
  const r = await fetch(`${process.env.TEST_BASE_URL}/api/parcel/track/${p1.trackingId}`);
  const data = await r.json();
  check('migrated parcel is trackable', r.status === 200 && data.statusHistory?.[0]?.note === 'Imported', data);

  await done();
})().catch((e) => { console.error(e); process.exit(1); });
