const express = require('express');
const cors = require('cors');
const { initDb, get, all, run } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS para permitir conexões do front-end React (Vite roda na porta 5173 por padrão)
app.use(cors());

// Aumenta o limite do body parser para aceitar imagens/assinaturas em Base64 grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Assinaturas Mockadas em SVG Inline em Base64
const DUMMY_SIGNATURE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M10 50 Q 50 10 100 50 T 200 50 T 290 30' stroke='%231e293b' stroke-width='2.5' fill='none'/></svg>";
const DUMMY_SIGNATURE_SVG_ALT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M15 60 C 60 20, 120 80, 200 30 C 240 10, 260 50, 285 40' stroke='%231e293b' stroke-width='2.5' fill='none'/></svg>";

// ==========================================
// ROTAS DE ALUNOS
// ==========================================

// Obter todos os alunos
app.get('/api/students', async (req, res) => {
  try {
    const students = await all('SELECT * FROM students');
    // Converte o campo 'active' de INTEGER (0/1) para boolean
    const formatted = students.map(s => ({
      ...s,
      active: !!s.active
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter alunos' });
  }
});

// Cadastrar novo aluno
app.post('/api/students', async (req, res) => {
  const { name, classroom } = req.body;
  if (!name || !classroom) {
    return res.status(400).json({ error: 'Nome e sala são obrigatórios' });
  }

  const id = String(Date.now());
  try {
    await run(
      'INSERT INTO students (id, name, classroom, active) VALUES (?, ?, ?, ?)',
      [id, name, classroom, 1]
    );
    res.status(201).json({ id, name, classroom, active: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar aluno' });
  }
});

// Cadastrar múltiplos alunos em lote (Importação em Massa)
app.post('/api/students/bulk', async (req, res) => {
  const { students } = req.body;
  if (!students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Lista de alunos inválida ou ausente.' });
  }

  try {
    const inserted = [];
    for (const s of students) {
      const { name, classroom } = s;
      if (!name || !classroom) continue;
      
      const id = String(Date.now() + Math.floor(Math.random() * 1000));
      await run(
        'INSERT INTO students (id, name, classroom, active) VALUES (?, ?, ?, ?)',
        [id, name, classroom, 1]
      );
      inserted.push({ id, name, classroom, active: true });
    }
    res.status(201).json(inserted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao importar alunos em massa.' });
  }
});

// Atualizar dados do aluno
app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const { name, classroom, active } = req.body;

  try {
    const student = await get('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const updatedActive = active !== undefined ? (active ? 1 : 0) : student.active;
    const updatedName = name || student.name;
    const updatedClassroom = classroom || student.classroom;

    await run(
      'UPDATE students SET name = ?, classroom = ?, active = ? WHERE id = ?',
      [updatedName, updatedClassroom, updatedActive, id]
    );

    res.json({
      id,
      name: updatedName,
      classroom: updatedClassroom,
      active: !!updatedActive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

// Alternar status ativo/inativo do aluno (Soft-delete/Restore)
app.patch('/api/students/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await get('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const newActive = student.active ? 0 : 1;
    await run('UPDATE students SET active = ? WHERE id = ?', [newActive, id]);

    res.json({
      ...student,
      active: !!newActive
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao alterar status do aluno' });
  }
});


// ==========================================
// ROTAS DE OCORRÊNCIAS
// ==========================================

// Obter todas as ocorrências
app.get('/api/occurrences', async (req, res) => {
  try {
    const occurrences = await all('SELECT * FROM occurrences');
    res.json(occurrences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter ocorrências' });
  }
});

// Registrar nova ocorrência
app.post('/api/occurrences', async (req, res) => {
  const occ = req.body;
  if (!occ.type || !occ.studentId || !occ.studentName || !occ.classroom || !occ.date) {
    return res.status(400).json({ error: 'Campos obrigatórios de ocorrência ausentes' });
  }

  const id = String(Date.now() + Math.floor(Math.random() * 1000));
  try {
    await run(
      `INSERT INTO occurrences (
        id, type, studentId, studentName, classroom, date, time, motive, guardian, staff, obs, signature,
        justified, notified, hasReturn, returnTime, timeIn, timeOut, startDate, days, endDate, cid, filePreview,
        recordedBy, attachmentName, attachmentType, attachmentData
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        occ.type,
        occ.studentId,
        occ.studentName,
        occ.classroom,
        occ.date,
        occ.time || null,
        occ.motive || null,
        occ.guardian || null,
        occ.staff || null,
        occ.obs || null,
        occ.signature || null,
        occ.justified || null,
        occ.notified || null,
        occ.hasReturn || null,
        occ.returnTime || null,
        occ.timeIn || null,
        occ.timeOut || null,
        occ.startDate || null,
        occ.days || null,
        occ.endDate || null,
        occ.cid || null,
        occ.filePreview || null,
        occ.recordedBy || null,
        occ.attachmentName || null,
        occ.attachmentType || null,
        occ.attachmentData || null
      ]
    );

    res.status(201).json({ id, ...occ });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar ocorrência' });
  }
});

// Atualizar ocorrência existente (Fluxo de Edição)
app.put('/api/occurrences/:id', async (req, res) => {
  const { id } = req.params;
  const occ = req.body;

  try {
    const existing = await get('SELECT * FROM occurrences WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Ocorrência não encontrada' });
    }

    await run(
      `UPDATE occurrences SET 
        type = ?, studentId = ?, studentName = ?, classroom = ?, date = ?, time = ?, motive = ?, 
        guardian = ?, staff = ?, obs = ?, signature = ?, justified = ?, notified = ?, 
        hasReturn = ?, returnTime = ?, timeIn = ?, timeOut = ?, startDate = ?, days = ?, 
        endDate = ?, cid = ?, filePreview = ?, recordedBy = ?, attachmentName = ?, 
        attachmentType = ?, attachmentData = ?
      WHERE id = ?`,
      [
        occ.type || existing.type,
        occ.studentId || existing.studentId,
        occ.studentName || existing.studentName,
        occ.classroom || existing.classroom,
        occ.date || existing.date,
        occ.time !== undefined ? occ.time : existing.time,
        occ.motive !== undefined ? occ.motive : existing.motive,
        occ.guardian !== undefined ? occ.guardian : existing.guardian,
        occ.staff !== undefined ? occ.staff : existing.staff,
        occ.obs !== undefined ? occ.obs : existing.obs,
        occ.signature !== undefined ? occ.signature : existing.signature,
        occ.justified !== undefined ? occ.justified : existing.justified,
        occ.notified !== undefined ? occ.notified : existing.notified,
        occ.hasReturn !== undefined ? occ.hasReturn : existing.hasReturn,
        occ.returnTime !== undefined ? occ.returnTime : existing.returnTime,
        occ.timeIn !== undefined ? occ.timeIn : existing.timeIn,
        occ.timeOut !== undefined ? occ.timeOut : existing.timeOut,
        occ.startDate !== undefined ? occ.startDate : existing.startDate,
        occ.days !== undefined ? occ.days : existing.days,
        occ.endDate !== undefined ? occ.endDate : existing.endDate,
        occ.cid !== undefined ? occ.cid : existing.cid,
        occ.filePreview !== undefined ? occ.filePreview : existing.filePreview,
        occ.recordedBy !== undefined ? occ.recordedBy : existing.recordedBy,
        occ.attachmentName !== undefined ? occ.attachmentName : existing.attachmentName,
        occ.attachmentType !== undefined ? occ.attachmentType : existing.attachmentType,
        occ.attachmentData !== undefined ? occ.attachmentData : existing.attachmentData,
        id
      ]
    );

    const updated = await get('SELECT * FROM occurrences WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência' });
  }
});

// Excluir ocorrência
app.delete('/api/occurrences/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const occ = await get('SELECT * FROM occurrences WHERE id = ?', [id]);
    if (!occ) {
      return res.status(404).json({ error: 'Ocorrência não encontrada' });
    }
    await run('DELETE FROM occurrences WHERE id = ?', [id]);
    res.json({ message: 'Ocorrência excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir ocorrência' });
  }
});

// ==========================================
// ROTAS DE PRESENÇA DIÁRIA (CHAMADA)
// ==========================================

// Obter histórico de chamadas diárias com filtros
app.get('/api/attendance', async (req, res) => {
  const { classroom, date, startDate, endDate } = req.query;
  let sql = 'SELECT * FROM attendance WHERE 1=1';
  const params = [];

  if (classroom && classroom !== 'all') {
    sql += ' AND classroom = ?';
    params.push(classroom);
  }
  if (date) {
    sql += ' AND date = ?';
    params.push(date);
  } else {
    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
  }

  try {
    const rows = await all(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter registros de presença' });
  }
});

// Salvar chamada diária de uma sala em lote (inserir ou atualizar)
app.post('/api/attendance/bulk', async (req, res) => {
  const { date, classroom, recordedBy, records } = req.body;
  if (!date || !classroom || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Dados da chamada diária inválidos' });
  }

  try {
    for (const record of records) {
      const { studentId, studentName, status } = record;
      const cleanDate = date.replace(/-/g, '');
      const id = `${studentId}${cleanDate}`;
      await run(
        `INSERT INTO attendance (id, date, studentId, studentName, classroom, status, recordedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = ?, recordedBy = ?`,
        [
          id,
          date,
          studentId,
          studentName,
          studentClassroom,
          status,
          recordedBy || 'Professor',
          status,
          recordedBy || 'Professor'
        ]
      );
    }
    res.json({ message: 'Chamada registrada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar a chamada diária' });
  }
});


// ==========================================
// ROTAS DE CONFIGURAÇÃO / SESSÃO
// ==========================================

// Obter todas as configurações
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
});

// Atualizar configurações (salva em chave-valor)
app.post('/api/settings', async (req, res) => {
  const settings = req.body; // Objeto de chave-valor
  try {
    for (const key of Object.keys(settings)) {
      await run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, String(settings[key]), String(settings[key])]
      );
    }
    res.json({ message: 'Configurações atualizadas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});


// ==========================================
// ROTAS DE SISTEMA (RESET, WIPE, SEED DUMMY)
// ==========================================

// 1. Zerar Histórico de Ocorrências
app.post('/api/settings/wipe', async (req, res) => {
  try {
    await run('DELETE FROM occurrences');
    res.json({ message: 'Histórico de ocorrências limpo com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao limpar histórico.' });
  }
});

// 2. Reiniciar todo o banco de dados (Zera tudo e re-semeia alunos originais)
app.post('/api/settings/reset', async (req, res) => {
  try {
    await run('DELETE FROM occurrences');
    await run('DELETE FROM students');
    await run('DELETE FROM settings');

    // Executa inicialização que recria alunos e settings padrão
    await initDb();

    res.json({ message: 'Sistema reiniciado e semeado com os dados originais com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao reiniciar sistema.' });
  }
});

// 3. Gerar massa de testes (Dummy Seeding realista dos últimos 30 dias)
app.post('/api/settings/seed', async (req, res) => {
  try {
    // Limpa ocorrências antes de semear para não acumular descontroladamente
    await run('DELETE FROM occurrences');

    const students = await all('SELECT * FROM students WHERE active = 1');
    if (students.length === 0) {
      return res.status(400).json({ error: 'Não há alunos ativos cadastrados para semear ocorrências.' });
    }

    const today = new Date();
    const atrasosMotivos = ["Consulta médica", "Trânsito", "Chuvas / Condições Climáticas", "Dormiu pouco / Cansaço", "Não se alimentou em casa", "Informado por e-mail dos pais", "Outros"];
    const saidasMotivos = ["Consulta médica / Tratamento", "Viagem / Compromisso familiar", "Criança indisposta / Mal-estar na escola", "Recomendação psicológica/terapêutica", "Outros"];
    const atestadoMotivos = ["Gripe / Resfriado comum", "Gastroenterite / Vômito / Diarreia", "Febre em investigação", "Conjuntivite infecciosa", "Catapora / Varicela", "Bronquite / Crise Respiratória", "Otite média aguda"];
    const faltasMotivos = ["Doença / Indisposição física", "Compromisso familiar / Viagem", "Dificuldade de transporte / Logística", "Condições climáticas / Chuva forte", "Sem justificativa declarada"];
    const parentNames = ["Marcos Santos", "Cláudia Nogueira", "Roberto Silva", "Juliana Lins", "Mariana Costa", "Fernando Santana", "Paula Paiva"];
    const staffNames = ["Auxiliar Jéssica", "Tia Solange", "Coord. Ana Clara", "Auxiliar Mariana"];

    // Semeia cerca de 95 ocorrências espalhadas nos últimos 30 dias
    let seededCount = 0;
    for (let i = 0; i < 95; i++) {
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const occDate = new Date();
      occDate.setDate(today.getDate() - daysAgo);

      // Evita fins de semana
      if (occDate.getDay() === 0 || occDate.getDay() === 6) {
        continue;
      }

      const dateStr = occDate.toISOString().split("T")[0];
      const student = students[Math.floor(Math.random() * students.length)];
      const randType = Math.random();

      const occId = `occ_seed_${Math.random().toString(36).substr(2, 9)}`;

      if (randType < 0.40) {
        // ATRASO (40%)
        const hour = "08:" + String(Math.floor(Math.random() * 45) + 15).padStart(2, "0");
        const motive = atrasosMotivos[Math.floor(Math.random() * atrasosMotivos.length)];
        const guardian = parentNames[Math.floor(Math.random() * parentNames.length)];

        await run(
          `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, time, motive, guardian, staff, obs, signature)
           VALUES (?, 'atraso', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            occId,
            student.id,
            student.name,
            student.classroom,
            dateStr,
            hour,
            motive,
            guardian,
            staffNames[Math.floor(Math.random() * staffNames.length)],
            Math.random() > 0.5 ? "Avisou com antecedência." : "",
            Math.random() > 0.5 ? DUMMY_SIGNATURE_SVG : DUMMY_SIGNATURE_SVG_ALT
          ]
        );
        seededCount++;
      } else if (randType < 0.65) {
        // FALTA (25%)
        const motive = faltasMotivos[Math.floor(Math.random() * faltasMotivos.length)];
        const just = Math.random() > 0.4 ? "sim" : "nao";

        await run(
          `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, motive, justified, notified, obs)
           VALUES (?, 'falta', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            occId,
            student.id,
            student.name,
            student.classroom,
            dateStr,
            motive,
            just,
            Math.random() > 0.5 ? "sim" : "nao",
            just === "sim" ? "Pais enviaram mensagem justificando." : ""
          ]
        );
        seededCount++;
      } else if (randType < 0.80) {
        // SAÍDA ANTECIPADA (15%)
        const hour = String(Math.floor(Math.random() * 4) + 13).padStart(2, "0") + ":" + String(Math.floor(Math.random() * 59)).padStart(2, "0");
        const motive = saidasMotivos[Math.floor(Math.random() * saidasMotivos.length)];
        const hasReturn = Math.random() > 0.8 ? "sim" : "nao";

        await run(
          `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, time, motive, guardian, hasReturn, returnTime, signature)
           VALUES (?, 'saida', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            occId,
            student.id,
            student.name,
            student.classroom,
            dateStr,
            hour,
            motive,
            parentNames[Math.floor(Math.random() * parentNames.length)],
            hasReturn,
            hasReturn === "sim" ? "16:30" : "",
            Math.random() > 0.5 ? DUMMY_SIGNATURE_SVG : DUMMY_SIGNATURE_SVG_ALT
          ]
        );
        seededCount++;
      } else if (randType < 0.92) {
        // AMAMENTAÇÃO (12%)
        const enterH = String(Math.floor(Math.random() * 3) + 14).padStart(2, "0");
        const enterM = Math.floor(Math.random() * 40);
        const timeIn = `${enterH}:${String(enterM).padStart(2, "0")}`;
        const timeOut = `${enterH}:${String(enterM + Math.floor(Math.random() * 20) + 15).padStart(2, "0")}`;

        await run(
          `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, timeIn, timeOut, guardian, obs)
           VALUES (?, 'amamentacao', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            occId,
            student.id,
            student.name,
            student.classroom,
            dateStr,
            timeIn,
            timeOut,
            parentNames[Math.floor(Math.random() * parentNames.length)],
            "Mamou super bem. Ficou dormindo após."
          ]
        );
        seededCount++;
      } else {
        // ATESTADO (8%)
        const days = Math.floor(Math.random() * 6) + 2;
        const motive = atestadoMotivos[Math.floor(Math.random() * atestadoMotivos.length)];
        const endDate = new Date(occDate);
        endDate.setDate(endDate.getDate() + days - 1);

        await run(
          `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, startDate, days, endDate, cid, motive, obs, filePreview)
           VALUES (?, 'atestado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            occId,
            student.id,
            student.name,
            student.classroom,
            dateStr,
            dateStr,
            days,
            endDate.toISOString().split("T")[0],
            "CID " + ["J11", "A09", "H10", "B01", "J20"][Math.floor(Math.random() * 5)],
            motive,
            "Apresentou documento médico assinado.",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23475569'>ATESTADO MÉDICO</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%2364748b'>Declaro para devidos fins de afastamento escolar.</text><line x1='50' y1='150' x2='250' y2='150' stroke='%2394a3b8' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%2394a3b8'>Assinatura do Profissional CRM 9988</text></svg>"
          ]
        );
        seededCount++;
      }
    }

    // Atestado ativo para Karina Moreira
    const activeAtestadoDate = new Date();
    activeAtestadoDate.setDate(today.getDate() - 1);
    const activeEndDate = new Date(activeAtestadoDate);
    activeEndDate.setDate(activeEndDate.getDate() + 5);

    const karina = students.find(s => s.name === "Karina Moreira");
    if (karina) {
      await run(
        `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, startDate, days, endDate, cid, motive, obs, filePreview)
         VALUES (?, 'atestado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `occ_active_atestado_karina`,
          karina.id,
          karina.name,
          karina.classroom,
          activeAtestadoDate.toISOString().split("T")[0],
          activeAtestadoDate.toISOString().split("T")[0],
          5,
          activeEndDate.toISOString().split("T")[0],
          "J11",
          "Conjuntivite infecciosa",
          "Atenção ao reintroduzir a criança na sala de aula pós conjuntivite.",
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23fef2f2' stroke='%23f87171' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23991b1b'>ATESTADO DE INFECÇÃO</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%23b91c1c'>Afastamento por Conjuntivite</text><line x1='50' y1='150' x2='250' y2='150' stroke='%23f87171' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23ef4444'>Pediatra Dr. Carlos CRM 5543</text></svg>"
        ]
      );
      seededCount++;
    }

    // Faltas recorrentes nas segundas para Gabriel Nogueira
    const gabriel = students.find(s => s.name === "Gabriel Nogueira");
    if (gabriel) {
      let count = 0;
      let d = new Date(today);
      while (count < 3) {
        d.setDate(d.getDate() - 1);
        if (d.getDay() === 1) { // 1 = Segunda
          await run(
            `INSERT INTO occurrences (id, type, studentId, studentName, classroom, date, motive, justified, notified, obs)
             VALUES (?, 'falta', ?, ?, ?, ?, ?, 'sim', 'sim', ?)`,
            [
              `occ_recurrent_falta_gabriel_${count}`,
              gabriel.id,
              gabriel.name,
              gabriel.classroom,
              d.toISOString().split("T")[0],
              "Compromisso familiar / Viagem",
              "Pais viajam frequentemente no final de semana prolongado."
            ]
          );
          count++;
          seededCount++;
        }
      }
    }

    res.json({ message: `Massa fictícia gerada com sucesso! ${seededCount} ocorrências inseridas.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao semear massa de testes' });
  }
});


// Inicializa a base de dados SQLite e depois liga o servidor
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[Back-end] Servidor rodando em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Erro fatal ao inicializar banco de dados SQLite:", err);
  process.exit(1);
});
