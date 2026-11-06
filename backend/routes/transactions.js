const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const auth = require('../middleware/auth');
const { convert, convertToUSD } = require('../utils/currencyConverter');
const { parseStatement } = require('../utils/statementParser');

const MAX_STATEMENT_MB = 2;

// Statements are parsed in memory and never written to disk. The form
// sends one file and two short fields (accountId, fileType); flat field
// names keep bracket syntax from turning them into objects or arrays.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_STATEMENT_MB * 1024 * 1024,
    files: 1,
    fields: 2,
    fieldSize: 64,
    parts: 3,
    fieldNestingDepth: 0,
  },
});

const receiveStatement = (req, res, next) => {
  upload.single('statement')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `Statement files are limited to ${MAX_STATEMENT_MB} MB` });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No statement file uploaded' });
    next();
  });
};

// Get all transactions
router.get('/', auth, async (req, res) => {
  try {
    const { accountId, startDate, endDate, category } = req.query;
    const filter = { user: req.userId };
    
    if (accountId) filter.account = accountId;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('account')
      .sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
router.post('/', auth, async (req, res) => {
  try {
    const { accountId, type, category, currency, description, date } = req.body;
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const account = await Account.findOne({ _id: accountId, user: req.userId });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactionCurrency = currency || account.currency;
    const amountInUSD = convertToUSD(amount, transactionCurrency);
    
    const transaction = new Transaction({
      user: req.userId,
      account: accountId,
      type,
      category,
      amount,
      originalAmount: amount,
      originalCurrency: transactionCurrency,
      amountInUSD,
      description,
      date: new Date(date),
    });

    await transaction.save();

    // Update the balance in the account's own currency with $inc, so
    // concurrent requests cannot overwrite each other's change.
    if (type === 'income' || type === 'expense') {
      const change = convert(amount, transactionCurrency, account.currency);
      await Account.updateOne(
        { _id: account._id },
        { $inc: { balance: type === 'income' ? change : -change } }
      );
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import bank statement
router.post('/import', auth, receiveStatement, async (req, res) => {
  try {
    const { accountId, fileType } = req.body;
    if (typeof accountId !== 'string' || !mongoose.isValidObjectId(accountId) || typeof fileType !== 'string') {
      return res.status(400).json({ error: 'accountId and fileType are required' });
    }

    // Only import into an account the caller owns, in that account's currency.
    const account = await Account.findOne({ _id: accountId, user: req.userId });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    let data;
    try {
      data = await parseStatement(req.file.buffer, fileType);
    } catch (error) {
      return res.status(400).json({ error: `Could not read the statement: ${error.message}` });
    }

    // Map the statement's columns to transaction fields
    const transactions = [];
    let net = 0;
    for (const row of data) {
      const amount = Math.abs(row.amount);
      const type = row.amount > 0 ? 'income' : 'expense';
      net += type === 'income' ? amount : -amount;
      transactions.push(new Transaction({
        user: req.userId,
        account: accountId,
        type,
        category: row.category || 'Uncategorized',
        amount,
        originalAmount: amount,
        originalCurrency: account.currency,
        amountInUSD: convertToUSD(amount, account.currency),
        description: row.description,
        date: new Date(row.date),
      }));
    }

    await Transaction.insertMany(transactions);
    await Account.updateOne({ _id: account._id }, { $inc: { balance: net } });
    res.json({ message: `Imported ${transactions.length} transactions` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;