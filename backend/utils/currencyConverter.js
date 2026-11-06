// Units of each currency per US dollar.
const rates = {
  USD: 1,
  AZN: 1.7015,
  EUR: 0.92, // Update this rate as needed
};

const convertToUSD = (amount, currency) => {
  if (!rates[currency]) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return amount / rates[currency];
};

// Account currencies are limited to the keys of rates by the Account schema.
const convert = (amount, from, to) =>
  from === to ? amount : convertToUSD(amount, from) * rates[to];

module.exports = { convertToUSD, convert };