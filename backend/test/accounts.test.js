const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp, useDatabase, registerUser, createAccount, request } = require('./helpers');

useDatabase();

test('users only see their own accounts', async () => {
  const app = createApp();
  const ana = await registerUser(app);
  const ben = await registerUser(app);
  await createAccount(app, ana.token, { name: 'Ana checking' });

  const res = await request(app)
    .get('/api/accounts')
    .set('Authorization', `Bearer ${ben.token}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('accounts report their balance in USD', async () => {
  const app = createApp();
  const { token } = await registerUser(app);
  await createAccount(app, token, { currency: 'AZN', balance: 170.15 });

  const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(Math.abs(res.body[0].balanceInUSD - 100) < 1e-9);
});
