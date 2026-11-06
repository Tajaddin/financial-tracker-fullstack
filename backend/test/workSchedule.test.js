const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp, useDatabase, registerUser, createAccount, request } = require('./helpers');

useDatabase();

const SHIFT = { date: '2026-01-05', position: 'Cashier', hourlyRate: 11, startTime: '09:00', endTime: '17:00', tips: 5 };

const get = (app, token, path) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`);
const postShift = (app, token, fields) =>
  request(app).post('/api/work-schedule').set('Authorization', `Bearer ${token}`).send({ ...SHIFT, ...fields });

test('shift earnings are booked to the account and move its balance', async () => {
  const app = createApp();
  const { token } = await registerUser(app);
  const account = await createAccount(app, token, { balance: 100 });

  const res = await postShift(app, token, { accountId: account._id });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.totalEarnings, 93);

  const transactions = (await get(app, token, '/transactions')).body;
  assert.deepEqual(transactions.map((t) => [t.category, t.amount]).sort(), [['Salary', 88], ['Tips', 5]]);
  assert.equal((await get(app, token, '/accounts')).body[0].balance, 193);
});

test('shift pay moves the balance in the account currency', async () => {
  const app = createApp();
  const { token } = await registerUser(app);
  const account = await createAccount(app, token, { currency: 'AZN' });

  assert.equal((await postShift(app, token, { accountId: account._id, tips: 0 })).status, 200);
  assert.ok(Math.abs((await get(app, token, '/accounts')).body[0].balance - 88 * 1.7015) < 1e-9);
});

test("earnings cannot be booked to another user's account", async () => {
  const app = createApp();
  const ana = await registerUser(app);
  const ben = await registerUser(app);
  const account = await createAccount(app, ana.token, { balance: 100 });

  const res = await postShift(app, ben.token, { accountId: account._id });
  assert.equal(res.status, 404);
  assert.deepEqual((await get(app, ben.token, '/transactions')).body, []);
  assert.deepEqual((await get(app, ben.token, '/work-schedule')).body, []);
  assert.equal((await get(app, ana.token, '/accounts')).body[0].balance, 100);
});
