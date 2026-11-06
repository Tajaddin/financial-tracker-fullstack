const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const { Readable } = require('stream');

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

// Formula, rich-text and hyperlink cells come back as objects; keep the shown value.
const cellValue = (value) => {
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  if ('result' in value) return value.result;
  if (value.richText) return value.richText.map((part) => part.text).join('');
  if ('text' in value) return value.text;
  return value;
};

// Rows of the first worksheet as objects keyed by the header row.
const parseExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers = sheet.getRow(1).values.map((h) => String(cellValue(h)).trim());
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    row.eachCell((cell, column) => {
      if (headers[column]) record[headers[column]] = cellValue(cell.value);
    });
    rows.push(record);
  });
  return rows;
};

const parseStatement = async (buffer, fileType) => {
  switch (fileType) {
    case 'csv':
      return parseCSV(buffer);
    case 'xlsx':
      return parseExcel(buffer);
    default:
      throw new Error('Unsupported file type; export the statement as CSV or XLSX');
  }
};

module.exports = { parseStatement };