const assert = require('node:assert/strict');
const { test } = require('node:test');
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
