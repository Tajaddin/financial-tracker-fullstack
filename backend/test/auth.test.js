const assert = require('node:assert/strict');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');
const { createApp, useDatabase, registerUser, request } = require('./helpers');

useDatabase();

test('a registered user can log in and reach protected routes', async () => {
  const app = createApp();
  await registerUser(app, { email: 'ana@example.com', password: 'pa55word' });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ana@example.com', password: 'pa55word' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, 'ana@example.com');

  const accounts = await request(app)
    .get('/api/accounts')
    .set('Authorization', `Bearer ${login.body.token}`);
  assert.equal(accounts.status, 200);
  assert.deepEqual(accounts.body, []);
});

test('login with the wrong password is refused', async () => {
  const app = createApp();
  await registerUser(app, { email: 'ana@example.com', password: 'pa55word' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ana@example.com', password: 'wrong' });
  assert.equal(res.status, 401);
  assert.equal(res.body.token, undefined);
});

test('protected routes need a valid token', async () => {
  const app = createApp();
  assert.equal((await request(app).get('/api/accounts')).status, 401);
  const forged = await request(app)
    .get('/api/accounts')
    .set('Authorization', 'Bearer not-a-jwt');
  assert.equal(forged.status, 401);
});

test('issued tokens expire after 12 hours', async () => {
  const { token } = await registerUser(createApp());
  const { iat, exp } = jwt.decode(token);
  assert.equal(exp - iat, 12 * 60 * 60);
});

test('tokens signed with another algorithm are refused', async () => {
  const app = createApp();
  const { user } = await registerUser(app);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { algorithm: 'HS512', expiresIn: '1h' });

  const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
});

test('tokens without an expiry stop working 12 hours after they were issued', async () => {
  const app = createApp();
  const { user } = await registerUser(app);
  const get = (token) => request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
  const now = Math.floor(Date.now() / 1000);
  const sign = (payload, options) => jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', ...options });

  assert.equal((await get(sign({ userId: user.id, iat: now - 60 }))).status, 200);
  assert.equal((await get(sign({ userId: user.id, iat: now - 13 * 60 * 60 }))).status, 401);
  assert.equal((await get(sign({ userId: user.id }, { noTimestamp: true }))).status, 401);
});
