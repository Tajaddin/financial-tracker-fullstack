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

test('an update cannot hand the account to another user', async () => {
  const app = createApp();
  const ana = await registerUser(app);
  const ben = await registerUser(app);
  const account = await createAccount(app, ana.token);

  const res = await request(app)
    .put(`/api/accounts/${account._id}`)
    .set('Authorization', `Bearer ${ana.token}`)
    .send({ name: 'Renamed', user: ben.user.id });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Renamed');
  assert.equal(res.body.user, ana.user.id);

  const bens = await request(app).get('/api/accounts').set('Authorization', `Bearer ${ben.token}`);
  assert.deepEqual(bens.body, []);
});

test('an update rejects an unsupported currency', async () => {
  const app = createApp();
  const { token } = await registerUser(app);
  const account = await createAccount(app, token);

  const res = await request(app)
    .put(`/api/accounts/${account._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ currency: 'GBP' });
  assert.equal(res.status, 400);
  const list = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
  assert.equal(list.status, 200);
  assert.equal(list.body[0].currency, 'USD');
});

test("updating an account that is not the caller's returns 404", async () => {
  const app = createApp();
  const ana = await registerUser(app);
  const ben = await registerUser(app);
  const account = await createAccount(app, ana.token);

  const res = await request(app)
    .put(`/api/accounts/${account._id}`)
    .set('Authorization', `Bearer ${ben.token}`)
    .send({ name: 'Mine now' });
  assert.equal(res.status, 404);
});

test('creating an account ignores fields the form does not edit', async () => {
  const app = createApp();
  const { token } = await registerUser(app);
  const account = await createAccount(app, token, { createdAt: '2000-01-01T00:00:00.000Z' });
  assert.notEqual(account.createdAt, '2000-01-01T00:00:00.000Z');
});
