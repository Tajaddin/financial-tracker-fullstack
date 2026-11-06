const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp, useDatabase, registerUser, request } = require('./helpers');

useDatabase();

test('responses carry the helmet security headers', async () => {
  const res = await request(createApp()).get('/api/accounts');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('MongoDB operator keys are stripped from request bodies', async () => {
  const app = createApp();
  app.post('/echo', (req, res) => res.json(req.body));

  const res = await request(app)
    .post('/echo')
    .send({ name: 'ok', email: { $ne: null }, 'profile.role': 'admin' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { name: 'ok', email: {} });
});

test('failed logins are rate limited per client', async () => {
  const app = createApp();
  await registerUser(app, { email: 'ana@example.com' });
  const attempt = () =>
    request(app).post('/api/auth/login').send({ email: 'ana@example.com', password: 'guess' });

  for (let i = 0; i < 5; i += 1) assert.equal((await attempt()).status, 401);
  assert.equal((await attempt()).status, 429);
});

test('login does not accept query operators in place of an email', async () => {
  const app = createApp();
  await registerUser(app, { email: 'ana@example.com', password: 'shared-password' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: { $ne: null }, password: 'shared-password' });
  assert.equal(res.status, 400);
  assert.equal(res.body.token, undefined);
});
