const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const auth = require('../middleware/auth');
const { convertToUSD } = require('../utils/currencyConverter');

// The fields the account form edits; never user, _id or createdAt.
const EDITABLE_FIELDS = ['name', 'bankName', 'accountNumber', 'currency', 'balance'];
const editableFields = (body = {}) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Get all accounts
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.userId });
    // balanceInUSD lets the dashboard total accounts held in different currencies.
    res.json(accounts.map((a) => ({ ...a.toObject(), balanceInUSD: convertToUSD(a.balance, a.currency) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create account
router.post('/', auth, async (req, res) => {
  try {
    const account = new Account({
      ...editableFields(req.body),
      user: req.userId,
    });
    await account.save();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      editableFields(req.body),
      { new: true, runValidators: true }
    );
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    res.status(error.name === 'ValidationError' ? 400 : 500).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', auth, async (req, res) => {
  try {
    await Account.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;