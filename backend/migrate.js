require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase a partir das variáveis de ambiente no arquivo .env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n[Erro Fatal] VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não foram definidos no arquivo .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rootDir = path.join(__dirname, '..');
const fileControle = path.join(rootDir, 'Controle presença SEAMI.xlsx');
const fileChamada = path.join(rootDir, 'chamada geral 2026.xlsx');

// ==========================================
// FUNÇÕES AUXILIARES DE NORMALIZAÇÃO E PARSING
// ==========================================

function toTitleCase(str) {
  if (!str) return '';
  const particles = ['de', 'da', 'do', 'dos', 'das', 'e'];
  return str.toString().toLowerCase().split(' ').map((word, index) => {
    if (particles.includes(word) && index !== 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function normalizeName(name) {
  if (!name) return '';
  const clean = name.toString().trim().replace(/\s+/g, ' ');
  return toTitleCase(clean);
}

function normalizeClassroom(room) {
  if (!room) return 'Desconhecida';
  const r = room.toString().trim().toLowerCase();
  if (r.startsWith('alegr')) return 'Alegria';
  if (r.startsWith('carinh')) return 'Carinho';
  if (r.startsWith('uni') || r.startsWith('uniã') || r.startsWith('unia')) return 'União';
  if (r.startsWith('amizad')) return 'Amizade';
  if (r.startsWith('felicid')) return 'Felicidade';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function parseExcelDate(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  
  const str = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  const parts = str.split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  
  const partsShort = str.split('/');
  if (partsShort.length === 2) {
    let day = partsShort[0].padStart(2, '0');
    let month = partsShort[1].padStart(2, '0');
    return `2026-${month}-${day}`;
  }

  return str;
}

function parseExcelTime(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  let str = val.toString().trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return str.substring(0, 5);
  }
  
  const match = str.match(/(\d{1,2})[h:]\s*(\d{2})?/i);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = (match[2] || '00').padStart(2, '0');
    return `${h}:${m}`;
  }
  
  return str;
}

function parseAtestadoDetails(motive, defaultDate) {
  const details = {
    cid: null,
    days: null,
    startDate: defaultDate,
    endDate: defaultDate
  };
  if (!motive) return details;
  
  const cidMatch = motive.match(/CID\s*:?\s*([A-Z]\d{2})/i);
  if (cidMatch) {
    details.cid = cidMatch[1].toUpperCase();
  } else {
    const looseCid = motive.match(/\b([A-Z]\d{2})\b/i);
    if (looseCid) details.cid = looseCid[1].toUpperCase();
  }

  const rangeMatch = motive.match(/(\d{1,2})\s+(?:a|à|ao|ate|até)\s+(\d{1,2})\/(\d{1,2})/i);
  if (rangeMatch) {
    const startDay = parseInt(rangeMatch[1], 10);
    const endDay = parseInt(rangeMatch[2], 10);
    const month = parseInt(rangeMatch[3], 10);
    const year = defaultDate ? defaultDate.split('-')[0] : '2026';
    
    const pad = (n) => String(n).padStart(2, '0');
    details.startDate = `${year}-${pad(month)}-${pad(startDay)}`;
    
    let endMonth = month;
    if (endDay < startDay) {
      details.startDate = `${year}-${pad(month - 1)}-${pad(startDay)}`;
    }
    
    details.endDate = `${year}-${pad(endMonth)}-${pad(endDay)}`;
    
    const start = new Date(details.startDate);
    const end = new Date(details.endDate);
    if (!isNaN(start) && !isNaN(end)) {
      details.days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
  } else {
    const daysMatch = motive.match(/(\d+)\s*dias?/i);
    if (daysMatch) {
      details.days = parseInt(daysMatch[1], 10);
      if (defaultDate && details.days) {
        details.startDate = defaultDate;
        const start = new Date(defaultDate);
        const end = new Date(start);
        end.setDate(start.getDate() + details.days - 1);
        details.endDate = end.toISOString().split('T')[0];
      }
    }
  }
  
  if (!details.days && details.startDate && details.endDate) {
    const start = new Date(details.startDate);
    const end = new Date(details.endDate);
    if (!isNaN(start) && !isNaN(end)) {
      details.days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  return details;
}

function parseFaltaJustified(motive) {
  if (!motive) return { justified: 'nao', notified: 'nao' };
  const m = motive.toLowerCase();
  
  const isJustified = m.includes('email') || 
                      m.includes('e-mail') ||
                      m.includes('mensagem') || 
                      m.includes('avis') || 
                      m.includes('justif') || 
                      m.includes('atestad') || 
                      m.includes('medic') || 
                      m.includes('consult') ||
                      m.includes('whatsapp') ||
                      m.includes('wpp') ||
                      m.includes('viaj');
                      
  return {
    justified: isJustified ? 'sim' : 'nao',
    notified: isJustified ? 'sim' : 'nao'
  };
}

function generateAtestadoSvg(studentName, cid, days, startDate, endDate, motive) {
  const cleanMotive = motive ? motive.replace(/['"<>&]/g, '') : 'Afastamento médico justificado.';
  const cleanCid = cid || 'Não informado';
  const cleanDays = days || 'Período indicado';
  
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='2'/><text x='150' y='40' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23991b1b'>ATESTADO MÉDICO IMPORTADO</text><text x='150' y='70' font-family='sans-serif' font-size='11' font-weight='bold' text-anchor='middle' fill='%23334155'>Paciente: ${studentName.substring(0, 26)}</text><text x='20' y='105' font-family='sans-serif' font-size='10' fill='%23475569'>CID: ${cleanCid}</text><text x='20' y='125' font-family='sans-serif' font-size='10' fill='%23475569'>Período: ${cleanDays} dias</text><text x='20' y='145' font-family='sans-serif' font-size='10' fill='%23475569'>De ${startDate} até ${endDate}</text><text x='20' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%2394a3b8'>Obs: ${cleanMotive.substring(0, 45)}...</text><line x1='150' y1='182' x2='280' y2='182' stroke='%2394a3b8' stroke-width='0.8'/><text x='215' y='192' font-family='sans-serif' font-size='7' text-anchor='middle' fill='%2394a3b8'>Assinatura Médica (Planilha)</text></svg>`;
}

// ==========================================
// PROCESSO PRINCIPAL DE MIGRAÇÃO
// ==========================================

async function executeMigration() {
  console.log('\n==================================================');
  console.log('INICIANDO MIGRAÇÃO DE PLANILHAS PARA SUPABASE (POSTGRES)');
  console.log('==================================================');

  // 1. Limpa Dados Anteriores do Supabase
  console.log('Limpando dados anteriores nas tabelas do Supabase...');
  
  const cleanOcc = await supabase.from('occurrences').delete().neq('id', '');
  if (cleanOcc.error) throw cleanOcc.error;
  
  const cleanAtt = await supabase.from('attendance').delete().neq('id', '');
  if (cleanAtt.error) throw cleanAtt.error;
  
  const cleanStud = await supabase.from('students').delete().neq('id', '');
  if (cleanStud.error) throw cleanStud.error;

  try {
    const cleanStaff = await supabase.from('staff').delete().neq('id', '');
    if (cleanStaff.error) {
      console.warn('\n[Aviso] A tabela "staff" não existe ou não pôde ser limpa no Supabase. Para usar recursos de equipe dinâmicos, execute o script SQL em supabase_schema.sql.');
    }
  } catch (err) {
    console.warn('\n[Aviso] Falha ao tentar limpar a tabela "staff" no Supabase. Continuando...');
  }
  
  console.log('Tabelas no Supabase prontas e vazias.');

  const studentsMap = new Map();

  // 2. FASE 1: Extrair e Consolidar Alunos
  console.log('\nFase 1: Extraindo e consolidando cadastro de alunos...');

  if (fs.existsSync(fileChamada)) {
    console.log(`Lendo alunos de: ${path.basename(fileChamada)}`);
    const wb = XLSX.readFile(fileChamada);
    
    for (const sheetName of ['MAIO', 'JUNHO', 'JULHO']) {
      if (!wb.Sheets[sheetName]) continue;
      
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        const rawName = row[0];
        const rawClass = row[1];
        
        if (!rawName || !rawClass) continue;
        
        const normName = normalizeName(rawName);
        const normClass = normalizeClassroom(rawClass);
        
        if (normName === '' || normName.startsWith('NOME') || normName.startsWith('FREQUÊNCIA')) continue;
        
        const key = `${normName}_${normClass}`;
        if (!studentsMap.has(key)) {
          const studentId = 'student_' + normName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + normClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          studentsMap.set(key, {
            id: studentId,
            name: normName,
            classroom: normClass,
            active: true
          });
        }
      }
    }
  }

  if (fs.existsSync(fileControle)) {
    console.log(`Lendo alunos adicionais de: ${path.basename(fileControle)}`);
    const wb = XLSX.readFile(fileControle);
    
    for (const sheetName of ['Atrasos', 'Saídas antecipadas', 'Atestados', 'Faltas']) {
      if (!wb.Sheets[sheetName]) continue;
      
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        const rawName = row[0];
        const rawClass = row[1];
        
        if (!rawName || !rawClass) continue;
        
        const normName = normalizeName(rawName);
        const normClass = normalizeClassroom(rawClass);
        
        if (normName === '' || normName.startsWith('Nome')) continue;
        
        const key = `${normName}_${normClass}`;
        if (!studentsMap.has(key)) {
          const studentId = 'student_' + normName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + normClass.toLowerCase().replace(/[^a-z0-9]/g, '');
          studentsMap.set(key, {
            id: studentId,
            name: normName,
            classroom: normClass,
            active: true
          });
        }
      }
    }
  }

  console.log(`Consolidação concluída. Total de alunos únicos: ${studentsMap.size}`);

  const studentsArray = Array.from(studentsMap.values());
  const { error: studErr } = await supabase.from('students').insert(studentsArray);
  if (studErr) throw studErr;
  console.log('Alunos salvos no Supabase com sucesso!');

  // 3. FASE 2: Migrar Chamada Diária (Attendance)
  console.log('\nFase 2: Migrando chamada diária de frequência...');
  const attendanceList = [];

  if (fs.existsSync(fileChamada)) {
    const wb = XLSX.readFile(fileChamada);
    const monthsConfig = { 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07' };
    
    for (const [sheetName, monthNum] of Object.entries(monthsConfig)) {
      if (!wb.Sheets[sheetName]) continue;
      
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const daysRow = rows[2];
      if (!daysRow) continue;
      
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        const normName = normalizeName(row[0]);
        const normClass = normalizeClassroom(row[1]);
        const key = `${normName}_${normClass}`;
        
        const student = studentsMap.get(key);
        if (!student) continue;
        
        for (let colIdx = 2; colIdx < row.length; colIdx++) {
          const dayNum = daysRow[colIdx];
          if (!dayNum || isNaN(dayNum)) continue;
          
          const cellVal = row[colIdx];
          if (cellVal === undefined || cellVal === null) continue;
          
          const rawStatus = cellVal.toString().trim().toUpperCase();
          let status = null;
          
          if (rawStatus === 'P') {
            status = 'P';
          } else if (rawStatus === 'FJ') {
            status = 'FJ';
          } else if (rawStatus === 'FN' || rawStatus === 'F') {
            status = 'F';
          } else {
            continue;
          }
          
          const dateStr = `2026-${monthNum}-${String(dayNum).padStart(2, '0')}`;
          const attId = `att_${student.id}_${dateStr}`;
          
          attendanceList.push({
            id: attId,
            date: dateStr,
            studentId: student.id,
            studentName: student.name,
            classroom: student.classroom,
            status,
            recordedBy: 'Planilha'
          });
        }
      }
    }
  }

  console.log(`Enviando chamadas em blocos para o Supabase...`);
  // Envia em blocos de 1000 para evitar limites de payload do REST API
  for (let i = 0; i < attendanceList.length; i += 1000) {
    const chunk = attendanceList.slice(i, i + 1000);
    const { error } = await supabase.from('attendance').insert(chunk);
    if (error) throw error;
  }
  console.log(`Presenças migradas com sucesso! Total: ${attendanceList.length}`);

  // 4. FASE 3: Migrar Ocorrências do Caderno de Registros
  console.log('\nFase 3: Migrando ocorrências do Controle de Presença SEAMI...');
  const occurrencesList = [];

  if (fs.existsSync(fileControle)) {
    const wb = XLSX.readFile(fileControle);

    // 4.1 ATRASOS
    if (wb.Sheets['Atrasos']) {
      const sheet = wb.Sheets['Atrasos'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        
        const normName = normalizeName(row[0]);
        const normClass = normalizeClassroom(row[1]);
        const key = `${normName}_${normClass}`;
        
        const student = studentsMap.get(key);
        if (!student) continue;
        
        const dateStr = parseExcelDate(row[2]);
        const timeStr = parseExcelTime(row[3]);
        const motive = row[4] ? row[4].toString().trim() : 'Chegada tardia registrada na planilha';
        if (!dateStr) continue;

        const occId = `atraso_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        occurrencesList.push({
          id: occId,
          type: 'atraso',
          studentId: student.id,
          studentName: student.name,
          classroom: student.classroom,
          date: dateStr,
          time: timeStr,
          motive,
          recordedBy: 'Planilha'
        });
      }
    }

    // 4.2 SAÍDAS ANTECIPADAS
    if (wb.Sheets['Saídas antecipadas']) {
      const sheet = wb.Sheets['Saídas antecipadas'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        
        const normName = normalizeName(row[0]);
        const normClass = normalizeClassroom(row[1]);
        const key = `${normName}_${normClass}`;
        
        const student = studentsMap.get(key);
        if (!student) continue;
        
        const dateStr = parseExcelDate(row[2]);
        const timeStr = parseExcelTime(row[3]);
        const motive = row[4] ? row[4].toString().trim() : 'Saída antecipada registrada na planilha';
        if (!dateStr) continue;

        const occId = `saida_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const hasReturn = motive.toLowerCase().includes('retorn') ? 'sim' : 'nao';
        
        occurrencesList.push({
          id: occId,
          type: 'saida',
          studentId: student.id,
          studentName: student.name,
          classroom: student.classroom,
          date: dateStr,
          time: timeStr,
          motive,
          hasReturn,
          recordedBy: 'Planilha'
        });
      }
    }

    // 4.3 ATESTADOS
    if (wb.Sheets['Atestados']) {
      const sheet = wb.Sheets['Atestados'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        
        const normName = normalizeName(row[0]);
        const normClass = normalizeClassroom(row[1]);
        const key = `${normName}_${normClass}`;
        
        const student = studentsMap.get(key);
        if (!student) continue;
        
        const dateStr = parseExcelDate(row[2]);
        const motive = row[4] ? row[4].toString().trim() : 'Atestado médico apresentado';
        if (!dateStr) continue;

        const details = parseAtestadoDetails(motive, dateStr);
        const svgPreview = generateAtestadoSvg(student.name, details.cid, details.days, details.startDate, details.endDate, motive);
        const occId = `atestado_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        occurrencesList.push({
          id: occId,
          type: 'atestado',
          studentId: student.id,
          studentName: student.name,
          classroom: student.classroom,
          date: dateStr,
          motive,
          startDate: details.startDate,
          days: details.days || 1,
          endDate: details.endDate,
          cid: details.cid || 'N/A',
          filePreview: svgPreview,
          recordedBy: 'Planilha'
        });
      }
    }

    // 4.4 FALTAS
    if (wb.Sheets['Faltas']) {
      const sheet = wb.Sheets['Faltas'];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        
        const normName = normalizeName(row[0]);
        const normClass = normalizeClassroom(row[1]);
        const key = `${normName}_${normClass}`;
        
        const student = studentsMap.get(key);
        if (!student) continue;
        
        const dateStr = parseExcelDate(row[2]);
        const motive = row[4] ? row[4].toString().trim() : 'Falta relatada na planilha';
        if (!dateStr) continue;

        const { justified, notified } = parseFaltaJustified(motive);
        const occId = `falta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        occurrencesList.push({
          id: occId,
          type: 'falta',
          studentId: student.id,
          studentName: student.name,
          classroom: student.classroom,
          date: dateStr,
          motive,
          justified,
          notified,
          recordedBy: 'Planilha'
        });
      }
    }
  }

  console.log(`Enviando ocorrências para o Supabase...`);
  // Envia em blocos de 500
  for (let i = 0; i < occurrencesList.length; i += 500) {
    const chunk = occurrencesList.slice(i, i + 500);
    const { error } = await supabase.from('occurrences').insert(chunk);
    if (error) throw error;
  }
  console.log(`Ocorrências migradas com sucesso! Total: ${occurrencesList.length}`);

  // Semeia configurações padrões de sistema se não existirem
  console.log('\nSemeando configurações padrão...');
  const { data: currentSettings } = await supabase.from('settings').select('*');
  const settingsMapObj = {};
  currentSettings?.forEach(s => { settingsMapObj[s.key] = s.value; });

  const defaultSettings = [];
  if (!settingsMapObj.theme) defaultSettings.push({ key: 'theme', value: 'light' });
  if (!settingsMapObj.activeRole) {
    defaultSettings.push({ key: 'activeRole', value: 'diretora' });
    defaultSettings.push({ key: 'activeUserName', value: 'Secretária Ana Clara' });
    defaultSettings.push({ key: 'activeUserAvatar', value: '👩‍💼' });
  }

  if (defaultSettings.length > 0) {
    await supabase.from('settings').insert(defaultSettings);
  }

  // Semeia funcionários iniciais
  console.log('Semeando equipe inicial...');
  const defaultStaff = [
    { id: 'staff_1', name: 'Secretária Ana Clara', role: 'diretora', avatar: '👩‍💼', desc: 'Acesso total e configurações' },
    { id: 'staff_2', name: 'Pedagoga Marina', role: 'pedagoga', avatar: '👩‍🏫', desc: 'Insights e relatórios pedagógicos' },
    { id: 'staff_3', name: 'Auxiliar Jéssica', role: 'auxiliar', avatar: '👩', desc: 'Apenas registro de ocorrências' }
  ];
  try {
    const { error: staffErr } = await supabase.from('staff').insert(defaultStaff);
    if (staffErr) {
      console.warn('[Aviso] Não foi possível semear a tabela "staff":', staffErr.message);
    } else {
      console.log('Equipe inicial semeada com sucesso.');
    }
  } catch (err) {
    console.warn('[Aviso] Falha ao tentar semear equipe no Supabase. Continuando...');
  }

  console.log('\n==================================================');
  console.log('MIGRAÇÃO PARA O SUPABASE CONCLUÍDA COM TOTAL SUCESSO!');
  console.log('==================================================');
}

executeMigration().catch(err => {
  console.error('\nERRO FATAL NA MIGRAÇÃO:', err);
  process.exit(1);
});
