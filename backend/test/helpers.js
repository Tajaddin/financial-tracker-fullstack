const assert = require('node:assert/strict');
const { before, after, afterEach } = require('node:test');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
const { createApp } = require('../app');

// One in-memory MongoDB per test file, emptied after every test.
function useDatabase() {
  let mongod;
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });
  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
    );
  });
  after(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
}

let users = 0;
async function registerUser(app, fields = {}) {
  users += 1;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `user${users}@example.com`, password: 'correct horse', name: 'Test User', ...fields });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

async function createAccount(app, token, fields = {}) {
  const res = await request(app)
    .post('/api/accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Checking', bankName: 'Test Bank', accountNumber: '0001', currency: 'USD', ...fields });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

module.exports = { createApp, useDatabase, registerUser, createAccount, request };
