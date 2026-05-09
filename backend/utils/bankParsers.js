// Bank-specific parsers for different statement formats
const parsers = {
  // Generic CSV parser
  genericCSV: (data) => {
    return data.map(row => ({
      date: row.Date || row.date || row.DATE,
      description: row.Description || row.description || row.DESC,
      amount: parseFloat(row.Amount || row.amount || row.AMOUNT),
      balance: parseFloat(row.Balance || row.balance || row.BALANCE),
    }));
  },

  // Bank of America format
  bofa: (data) => {
    return data.map(row => ({
      date: row['Date'],
      description: row['Description'],
      amount: parseFloat(row['Amount']),
      type: parseFloat(row['Amount']) > 0 ? 'income' : 'expense',
    }));
  },

  // Chase format
  chase: (data) => {
    return data.map(row => ({
      date: row['Transaction Date'],
      description: row['Description'],
      amount: parseFloat(row['Amount']),
      type: row['Type'] === 'DEBIT' ? 'expense' : 'income',
    }));
  },

  // Wells Fargo format
  wellsfargo: (data) => {
    return data.map(row => ({
      date: row['Date'],
      description: row['Description'],
      amount: Math.abs(parseFloat(row['Amount'])),
      type: parseFloat(row['Amount']) < 0 ? 'expense' : 'income',
    }));
  },
};

module.exports = { parsers };