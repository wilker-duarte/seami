const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const file1 = path.join(rootDir, 'Controle presença SEAMI.xlsx');
const file2 = path.join(rootDir, 'chamada geral 2026.xlsx');

const inspectFile = (filePath, name) => {
  console.log(`\n===========================================`);
  console.log(`INSPECIONANDO: ${name}`);
  console.log(`===========================================`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Arquivo não encontrado em: ${filePath}`);
    return;
  }
  
  const workbook = XLSX.readFile(filePath);
  console.log(`Planilhas encontradas:`, workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Planilha: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Total de linhas: ${data.length}`);
    console.log(`Primeiras 5 linhas:`);
    data.slice(0, 5).forEach((row, i) => {
      console.log(`  Linha ${i + 1}:`, row);
    });
  }
};

inspectFile(file1, 'Controle presença SEAMI.xlsx');
inspectFile(file2, 'chamada geral 2026.xlsx');
