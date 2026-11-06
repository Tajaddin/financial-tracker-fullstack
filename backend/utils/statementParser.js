const csv = require('csv-parser');
const { Readable } = require('stream');
const XLSX = require('xlsx');
const pdf = require('pdf-parse');

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    Readable.from(buffer)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

const parsePDF = async (buffer) => {
  const data = await pdf(buffer);
  // Basic parsing - you'll need to implement specific logic based on your bank's format
  return data.text;
};

const parseStatement = async (buffer, fileType) => {
  switch (fileType) {
    case 'csv':
      return parseCSV(buffer);
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer);
    case 'pdf':
      return parsePDF(buffer);
    default:
      throw new Error('Unsupported file type');
  }
};

module.exports = { parseStatement };