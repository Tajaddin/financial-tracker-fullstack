const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createApp, useDatabase, registerUser, createAccount, request } = require('./helpers');

useDatabase();

async function setup(accountFields) {
  const app = createApp();
  const { token } = await registerUser(app);
  const account = await createAccount(app, token, accountFields);
  const post = (fields) =>
    request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id, type: 'income', category: 'Salary', amount: 10, date: '2026-01-05', ...fields });
  const importCsv = (csv) =>
    request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .field('accountId', account._id)
      .field('fileType', 'csv')
      .attach('statement', Buffer.from(csv), 'statement.csv');
  const balance = async () => {
    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
    return res.body[0].balance;
  };
  return { post, importCsv, balance };
}

test('income and expenses move the balance', async () => {
  const { post, balance } = await setup({ balance: 100 });
  assert.equal((await post({ type: 'income', amount: 50 })).status, 200);
  assert.equal((await post({ type: 'expense', category: 'Food', amount: 30 })).status, 200);
  assert.equal(await balance(), 120);
});

test('concurrent transactions all reach the balance', async () => {
  const { post, balance } = await setup();
  const results = await Promise.all(Array.from({ length: 20 }, () => post({ amount: 10 })));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(await balance(), 200);
});

test('a statement import and concurrent transactions all reach the balance', async () => {
  const { post, importCsv, balance } = await setup();
  const csv = 'date,description,amount\n2026-01-05,Salary,1000\n2026-01-06,Rent,-400\n';
  const results = await Promise.all([importCsv(csv), ...Array.from({ length: 5 }, () => post({ amount: 10 }))]);
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(await balance(), 650);
});

test('a transaction in another currency moves the balance in the account currency', async () => {
  const { post, balance } = await setup({ currency: 'AZN' });
  const res = await post({ amount: 100, currency: 'USD' });
  assert.equal(res.status, 200);
  assert.equal(res.body.amountInUSD, 100);
  assert.ok(Math.abs((await balance()) - 170.15) < 1e-9, `balance ${await balance()}`);
});

test('amounts must be positive numbers', async () => {
  const { post, balance } = await setup({ balance: 100 });
  for (const amount of [0, -5, 'abc', null]) {
    const res = await post({ amount });
    assert.equal(res.status, 400, `amount ${amount}: ${res.status}`);
  }
  assert.equal(await balance(), 100);
});
