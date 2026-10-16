const express = require('express');
const router = express.Router();
const multer = require('multer');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const auth = require('../middleware/auth');
const { convertToUSD } = require('../utils/currencyConverter');
const { parseStatement } = require('../utils/statementParser');

const upload = multer({ dest: 'uploads/' });

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
    const { accountId, type, category, amount, currency, description, date } = req.body;
    
    const account = await Account.findOne({ _id: accountId, user: req.userId });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const amountInUSD = convertToUSD(amount, currency || account.currency);
    
    const transaction = new Transaction({
      user: req.userId,
      account: accountId,
      type,
      category,
      amount,
      originalAmount: amount,
      originalCurrency: currency || account.currency,
      amountInUSD,
      description,
      date: new Date(date),
    });

    await transaction.save();

    // Update account balance
    if (type === 'income') {
      account.balance += amount;
    } else if (type === 'expense') {
      account.balance -= amount;
    }
    await account.save();

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import bank statement
router.post('/import', auth, upload.single('statement'), async (req, res) => {
  try {
    const { accountId, fileType } = req.body;
    const filePath = req.file.path;

    // Only import into an account the caller owns, in that account's currency.
    const account = await Account.findOne({ _id: accountId, user: req.userId });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const data = await parseStatement(filePath, fileType);

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
    account.balance += net;
    await account.save();
    res.json({ message: `Imported ${transactions.length} transactions` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;