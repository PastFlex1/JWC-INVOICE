import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function generateStyledExcel({
  ws_data,
  fileName,
  sheetName = 'Sheet1',
  colWidths = [],
  headerRowIndex,
}: {
  ws_data: any[][];
  fileName: string;
  sheetName?: string;
  colWidths?: number[];
  headerRowIndex?: number;
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  ws_data.forEach(row => {
    worksheet.addRow(row);
  });

  colWidths.forEach((width, i) => {
    const col = worksheet.getColumn(i + 1);
    col.width = width;
  });

  const primaryGreen = '004D40'; // JCW Flowers dark green
  const lightGray = 'F9FAFB';
  const white = 'FFFFFF';

  let actualHeaderIndex = headerRowIndex;
  if (actualHeaderIndex === undefined) {
    for (let i = 0; i < ws_data.length; i++) {
      const row = ws_data[i];
      const filledCount = row.filter(cell => cell !== undefined && cell !== null && cell !== '').length;
      if (filledCount > 2) {
        actualHeaderIndex = i;
        break;
      }
    }
  }

  worksheet.eachRow((row, rowNumber) => {
    const rowIndex0 = rowNumber - 1;
    const isBeforeHeader = actualHeaderIndex !== undefined && rowIndex0 < actualHeaderIndex;
    const isHeader = actualHeaderIndex !== undefined && rowIndex0 === actualHeaderIndex;
    const isData = actualHeaderIndex !== undefined ? rowIndex0 > actualHeaderIndex : true;

    const rowValues = row.values as any[];
    const rowText = rowValues.join(' ').toLowerCase();
    const isTotalRow = rowText.includes('total') || rowText.includes('saldo') || rowText.includes('pending') || rowText.includes('fee');

    if (rowIndex0 === 0) {
      row.font = { name: 'Arial', size: 16, bold: true, color: { argb: primaryGreen } };
    }

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (!cell.font) {
         cell.font = { name: 'Arial', size: 10 };
      }
      cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' };

      if (isBeforeHeader && rowIndex0 > 0) {
         if (colNumber === 1 && cell.value) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '374151' } };
         }
      }

      if (isHeader) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: primaryGreen }
        };
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: white } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: primaryGreen } },
          bottom: { style: 'medium', color: { argb: primaryGreen } },
        };
      } else if (isData) {
        if (isTotalRow) {
          cell.font = { name: 'Arial', size: 10, bold: true };
          cell.border = {
             top: { style: 'thin', color: { argb: '9CA3AF' } },
             bottom: { style: 'double', color: { argb: '9CA3AF' } }
          };
          cell.fill = {
             type: 'pattern',
             pattern: 'solid',
             fgColor: { argb: 'F3F4F6' }
          };
        } else {
          const isEven = rowNumber % 2 === 0;
          if (cell.value !== null && cell.value !== undefined) {
             cell.fill = {
               type: 'pattern',
               pattern: 'solid',
               fgColor: { argb: isEven ? lightGray : white }
             };
          }
          cell.border = {
            bottom: { style: 'hair', color: { argb: 'E5E7EB' } }
          };
        }

        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
}
