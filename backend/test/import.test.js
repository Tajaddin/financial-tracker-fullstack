const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ExcelJS = require('exceljs');
const { createApp, useDatabase, registerUser, createAccount, request } = require('./helpers');

useDatabase();

const uploadsDir = path.resolve('uploads');
const listUploads = () => (fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []);

const CSV = [
  'date,description,amount,category',
  '2026-01-05,Salary,1500.00,Income',
  '2026-01-06,Groceries,-45.20,Food',
].join('\n');

async function setup() {
  const app = createApp();
  const { token } = await registerUser(app);
  const account = await createAccount(app, token);
  const importStatement = (file, filename, fileType) => {
    const req = request(app)
      .post('/api/transactions/import')
      .set('Authorization', `Bearer ${token}`)
      .field('accountId', account._id)
      .field('fileType', fileType);
    return file ? req.attach('statement', file, filename) : req;
  };
  const balance = async () => {
    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
    return res.body[0].balance;
  };
  return { app, importStatement, balance };
}

test('imports a CSV statement and applies it to the balance', async () => {
  const { importStatement, balance } = await setup();
  const res = await importStatement(Buffer.from(CSV), 'statement.csv', 'csv');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.message, 'Imported 2 transactions');
  assert.ok(Math.abs((await balance()) - 1454.8) < 1e-9);
});

test('imports an Excel statement with real dates and formula amounts', async () => {
  const { app, importStatement, balance } = await setup();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Statement');
  sheet.addRow(['date', 'description', 'amount', 'category']);
  sheet.addRow([new Date('2026-01-05T00:00:00Z'), 'Salary', { formula: '1000+500', result: 1500 }, 'Income']);
  sheet.addRow([new Date('2026-01-06T00:00:00Z'), 'Groceries', -45.2, 'Food']);
  const file = Buffer.from(await workbook.xlsx.writeBuffer());

  const res = await importStatement(file, 'statement.xlsx', 'xlsx');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.message, 'Imported 2 transactions');
  assert.ok(Math.abs((await balance()) - 1454.8) < 1e-9);

  const token = res.request.header.Authorization;
  const list = await request(app).get('/api/transactions').set('Authorization', token);
  const dates = list.body.map((t) => t.date.slice(0, 10)).sort();
  assert.deepEqual(dates, ['2026-01-05', '2026-01-06']);
});

test('rejects formats it cannot read with 400', async () => {
  const { importStatement, balance } = await setup();
  for (const [name, type] of [['statement.pdf', 'pdf'], ['statement.xls', 'xls'], ['statement.xlsx', 'xlsx']]) {
    const res = await importStatement(Buffer.from('%PDF-1.4 not a spreadsheet'), name, type);
    assert.equal(res.status, 400, `${type}: ${JSON.stringify(res.body)}`);
  }
  assert.equal(await balance(), 0);
});

test('rejects a statement over the size limit with 413', async () => {
  const { importStatement, balance } = await setup();
  const big = Buffer.concat([Buffer.from(CSV + '\n'), Buffer.alloc(3 * 1024 * 1024, 'x')]);
  const res = await importStatement(big, 'statement.csv', 'csv');
  assert.equal(res.status, 413);
  assert.equal(await balance(), 0);
});

test('rejects an import without a file with 400', async () => {
  const { importStatement } = await setup();
  const res = await importStatement(null, null, 'csv');
  assert.equal(res.status, 400);
});

test('does not keep uploaded statements on disk', async () => {
  const { importStatement } = await setup();
  const before = listUploads();
  const res = await importStatement(Buffer.from(CSV), 'statement.csv', 'csv');
  assert.equal(res.status, 200);
  assert.deepEqual(listUploads(), before);
});

test('does not serve the uploads directory', async (t) => {
  const { app } = await setup();
  const created = !fs.existsSync(uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
  const probe = path.join(uploadsDir, 'probe-statement.csv');
  fs.writeFileSync(probe, CSV);
  t.after(() => fs.rmSync(created ? uploadsDir : probe, { recursive: true, force: true }));

  const res = await request(app).get('/uploads/probe-statement.csv');
  assert.equal(res.status, 404);
});
