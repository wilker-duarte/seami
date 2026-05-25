import { createClient } from '@supabase/supabase-js';

// Carrega as credenciais das variáveis de ambiente injetadas pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não foram definidos no arquivo .env!'
  );
}

// Cria a instância do cliente Supabase
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// ==========================================
// MÉTODOS DE ALUNOS (STUDENTS)
// ==========================================

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name');
  if (error) {
    console.error('[Supabase] Erro ao obter alunos:', error);
    throw error;
  }
  return data;
}

export async function saveStudent(student) {
  const payload = {
    id: student.id || `student_${Date.now()}`,
    name: student.name,
    classroom: student.classroom,
    active: student.active ?? true
  };
  const { data, error } = await supabase
    .from('students')
    .upsert(payload)
    .select()
    .single();
  if (error) {
    console.error('[Supabase] Erro ao salvar aluno:', error);
    throw error;
  }
  return data;
}

export async function toggleStudentActive(studentId) {
  const { data: student, error: getErr } = await supabase
    .from('students')
    .select('active')
    .eq('id', studentId)
    .single();
  if (getErr) {
    console.error('[Supabase] Erro ao obter status do aluno:', getErr);
    throw getErr;
  }

  const { data, error } = await supabase
    .from('students')
    .update({ active: !student.active })
    .eq('id', studentId)
    .select()
    .single();
  if (error) {
    console.error('[Supabase] Erro ao alternar status do aluno:', error);
    throw error;
  }
  return data;
}

export async function saveStudentBulk(studentsArray) {
  const records = studentsArray.map(s => ({
    id: s.id || `student_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: s.name,
    classroom: s.classroom,
    active: s.active ?? true
  }));
  const { data, error } = await supabase
    .from('students')
    .upsert(records)
    .select();
  if (error) {
    console.error('[Supabase] Erro na importação de alunos:', error);
    throw error;
  }
  return data;
}

// ==========================================
// MÉTODOS DE OCORRÊNCIAS (OCCURRENCES)
// ==========================================

export async function getOccurrences() {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*')
    .order('date', { ascending: false });
  if (error) {
    console.error('[Supabase] Erro ao obter ocorrências:', error);
    throw error;
  }
  return data;
}

export async function saveOccurrence(occ) {
  const isEditing = !!occ.id;
  const id = occ.id || `${occ.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  const payload = {
    id,
    type: occ.type,
    studentId: occ.studentId,
    studentName: occ.studentName,
    classroom: occ.classroom,
    date: occ.date,
    time: occ.time || null,
    motive: occ.motive || null,
    guardian: occ.guardian || null,
    staff: occ.staff || null,
    obs: occ.obs || null,
    signature: occ.signature || null,
    justified: occ.justified || null,
    notified: occ.notified || null,
    hasReturn: occ.hasReturn || null,
    returnTime: occ.returnTime || null,
    timeIn: occ.timeIn || null,
    timeOut: occ.timeOut || null,
    startDate: occ.startDate || null,
    days: occ.days || null,
    endDate: occ.endDate || null,
    cid: occ.cid || null,
    filePreview: occ.filePreview || null,
    recordedBy: occ.recordedBy || null,
    attachmentName: occ.attachmentName || null,
    attachmentType: occ.attachmentType || null,
    attachmentData: occ.attachmentData || null
  };

  const { data, error } = await supabase
    .from('occurrences')
    .upsert(payload)
    .select()
    .single();
  if (error) {
    console.error('[Supabase] Erro ao salvar ocorrência:', error);
    throw error;
  }
  return data;
}

export async function deleteOccurrence(id) {
  const { error } = await supabase
    .from('occurrences')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[Supabase] Erro ao deletar ocorrência:', error);
    throw error;
  }
  return true;
}

// ==========================================
// MÉTODOS DE PRESENÇA (ATTENDANCE)
// ==========================================

export async function getAttendance(filters = {}) {
  let query = supabase.from('attendance').select('*');
  
  if (filters.classroom && filters.classroom !== 'all') {
    query = query.eq('classroom', filters.classroom);
  }
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  if (filters.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('date', filters.endDate);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] Erro ao buscar chamada:', error);
    throw error;
  }
  return data;
}

export async function saveAttendanceBulk({ date, classroom, recordedBy, records }) {
  const dbRecords = records.map(r => {
    const studentClassroom = r.classroom || classroom;
    return {
      id: `att_${r.studentId}_${date}`,
      date,
      studentId: r.studentId,
      studentName: r.studentName,
      classroom: studentClassroom,
      status: r.status,
      recordedBy: recordedBy || 'Professor'
    };
  });

  const { data, error } = await supabase
    .from('attendance')
    .upsert(dbRecords)
    .select();
  if (error) {
    console.error('[Supabase] Erro ao salvar chamada em lote:', error);
    throw error;
  }
  return data;
}

// ==========================================
// MÉTODOS DE CONFIGURAÇÕES (SETTINGS)
// ==========================================

export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*');
  if (error) {
    console.error('[Supabase] Erro ao obter configurações:', error);
    throw error;
  }
  const settings = {};
  data?.forEach(r => {
    settings[r.key] = r.value;
  });
  return settings;
}

export async function saveSettings(settingsObj) {
  const dbRecords = Object.entries(settingsObj).map(([key, value]) => ({
    key,
    value: String(value)
  }));
  const { data, error } = await supabase
    .from('settings')
    .upsert(dbRecords)
    .select();
  if (error) {
    console.error('[Supabase] Erro ao salvar configurações:', error);
    throw error;
  }
  return data;
}

// ==========================================
// MÉTODOS DE MANUTENÇÃO (WIPE, RESET, SEED)
// ==========================================

export async function wipeHistory() {
  const { error } = await supabase
    .from('occurrences')
    .delete()
    .neq('id', '');
  if (error) {
    console.error('[Supabase] Erro ao limpar histórico de ocorrências:', error);
    throw error;
  }
  return true;
}

export async function resetDatabase() {
  // Limpa tudo por completo
  const deleteOcc = supabase.from('occurrences').delete().neq('id', '');
  const deleteStud = supabase.from('students').delete().neq('id', '');
  const deleteSet = supabase.from('settings').delete().neq('id', '');
  
  await Promise.all([deleteOcc, deleteStud, deleteSet]);

  // Restaura configurações padrões iniciais
  await saveSettings({
    theme: 'light',
    activeRole: 'diretora',
    activeUserName: 'Diretora Ana Clara',
    activeUserAvatar: '👩‍💼'
  });
  return true;
}

export async function seedDemoData() {
  // Limpa histórico primeiro
  await wipeHistory();

  const students = await getStudents();
  const activeStudents = students.filter(s => s.active);
  if (activeStudents.length === 0) {
    throw new Error('Não há alunos ativos cadastrados para semear ocorrências de teste.');
  }

  const DUMMY_SIGNATURE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M10 50 Q 50 10 100 50 T 200 50 T 290 30' stroke='%231e293b' stroke-width='2.5' fill='none'/></svg>";
  const DUMMY_SIGNATURE_SVG_ALT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M15 60 C 60 20, 120 80, 200 30 C 240 10, 260 50, 285 40' stroke='%231e293b' stroke-width='2.5' fill='none'/></svg>";

  const atrasosMotivos = ["Consulta médica", "Trânsito", "Chuvas / Condições Climáticas", "Dormiu pouco / Cansaço", "Não se alimentou em casa", "Informado por e-mail dos pais", "Outros"];
  const saidasMotivos = ["Consulta médica / Tratamento", "Viagem / Compromisso familiar", "Criança indisposta / Mal-estar na escola", "Recomendação psicológica/terapêutica", "Outros"];
  const atestadoMotivos = ["Gripe / Resfriado comum", "Gastroenterite / Vômito / Diarreia", "Febre em investigação", "Conjuntivite infecciosa", "Catapora / Varicela", "Bronquite / Crise Respiratória", "Otite média aguda"];
  const faltasMotivos = ["Doença / Indisposição física", "Compromisso familiar / Viagem", "Dificuldade de transporte / Logística", "Condições climáticas / Chuva forte", "Sem justificativa declarada"];
  const parentNames = ["Marcos Santos", "Cláudia Nogueira", "Roberto Silva", "Juliana Lins", "Mariana Costa", "Fernando Santana", "Paula Paiva"];
  const staffNames = ["Auxiliar Jéssica", "Tia Solange", "Coord. Ana Clara", "Auxiliar Mariana"];

  const records = [];
  const today = new Date();

  // Gera cerca de 95 ocorrências
  for (let i = 0; i < 95; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const occDate = new Date();
    occDate.setDate(today.getDate() - daysAgo);

    if (occDate.getDay() === 0 || occDate.getDay() === 6) continue; // Pula fins de semana

    const dateStr = occDate.toISOString().split("T")[0];
    const student = activeStudents[Math.floor(Math.random() * activeStudents.length)];
    const randType = Math.random();
    const occId = `occ_seed_${Math.random().toString(36).substr(2, 9)}`;

    if (randType < 0.40) {
      // ATRASO
      const hour = "08:" + String(Math.floor(Math.random() * 45) + 15).padStart(2, "0");
      const motive = atrasosMotivos[Math.floor(Math.random() * atrasosMotivos.length)];
      records.push({
        id: occId,
        type: 'atraso',
        studentId: student.id,
        studentName: student.name,
        classroom: student.classroom,
        date: dateStr,
        time: hour,
        motive,
        guardian: parentNames[Math.floor(Math.random() * parentNames.length)],
        staff: staffNames[Math.floor(Math.random() * staffNames.length)],
        obs: Math.random() > 0.5 ? "Avisou com antecedência." : "",
        signature: Math.random() > 0.5 ? DUMMY_SIGNATURE_SVG : DUMMY_SIGNATURE_SVG_ALT
      });
    } else if (randType < 0.65) {
      // FALTA
      const motive = faltasMotivos[Math.floor(Math.random() * faltasMotivos.length)];
      const just = Math.random() > 0.4 ? "sim" : "nao";
      records.push({
        id: occId,
        type: 'falta',
        studentId: student.id,
        studentName: student.name,
        classroom: student.classroom,
        date: dateStr,
        motive,
        justified: just,
        notified: Math.random() > 0.5 ? "sim" : "nao",
        obs: just === "sim" ? "Pais enviaram mensagem justificando." : ""
      });
    } else if (randType < 0.80) {
      // SAÍDA ANTECIPADA
      const hour = String(Math.floor(Math.random() * 4) + 13).padStart(2, "0") + ":" + String(Math.floor(Math.random() * 59)).padStart(2, "0");
      const motive = saidasMotivos[Math.floor(Math.random() * saidasMotivos.length)];
      const hasReturn = Math.random() > 0.8 ? "sim" : "nao";
      records.push({
        id: occId,
        type: 'saida',
        studentId: student.id,
        studentName: student.name,
        classroom: student.classroom,
        date: dateStr,
        time: hour,
        motive,
        guardian: parentNames[Math.floor(Math.random() * parentNames.length)],
        hasReturn,
        returnTime: hasReturn === "sim" ? "16:30" : "",
        signature: Math.random() > 0.5 ? DUMMY_SIGNATURE_SVG : DUMMY_SIGNATURE_SVG_ALT
      });
    } else if (randType < 0.92) {
      // AMAMENTAÇÃO
      const enterH = String(Math.floor(Math.random() * 3) + 14).padStart(2, "0");
      const enterM = Math.floor(Math.random() * 40);
      const timeIn = `${enterH}:${String(enterM).padStart(2, "0")}`;
      const timeOut = `${enterH}:${String(enterM + Math.floor(Math.random() * 20) + 15).padStart(2, "0")}`;
      records.push({
        id: occId,
        type: 'amamentacao',
        studentId: student.id,
        studentName: student.name,
        classroom: student.classroom,
        date: dateStr,
        timeIn,
        timeOut,
        guardian: parentNames[Math.floor(Math.random() * parentNames.length)],
        obs: "Mamou super bem. Ficou dormindo após."
      });
    } else {
      // ATESTADO
      const days = Math.floor(Math.random() * 6) + 2;
      const motive = atestadoMotivos[Math.floor(Math.random() * atestadoMotivos.length)];
      const endDate = new Date(occDate);
      endDate.setDate(endDate.getDate() + days - 1);
      const cid = "CID " + ["J11", "A09", "H10", "B01", "J20"][Math.floor(Math.random() * 5)];
      records.push({
        id: occId,
        type: 'atestado',
        studentId: student.id,
        studentName: student.name,
        classroom: student.classroom,
        date: dateStr,
        startDate: dateStr,
        days,
        endDate: endDate.toISOString().split("T")[0],
        cid,
        motive,
        obs: "Apresentou documento médico assinado.",
        filePreview: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23475569'>ATESTADO MÉDICO</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%2364748b'>Declaro para devidos fins de afastamento escolar.</text><line x1='50' y1='150' x2='250' y2='150' stroke='%2394a3b8' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%2394a3b8'>Assinatura do Profissional CRM 9988</text></svg>`
      });
    }
  }

  // Atestado ativo para Karina Moreira
  const karina = activeStudents.find(s => s.name === "Karina Moreira");
  if (karina) {
    const activeAtestadoDate = new Date();
    activeAtestadoDate.setDate(today.getDate() - 1);
    const activeEndDate = new Date(activeAtestadoDate);
    activeEndDate.setDate(activeEndDate.getDate() + 5);

    records.push({
      id: `occ_active_atestado_karina`,
      type: 'atestado',
      studentId: karina.id,
      studentName: karina.name,
      classroom: karina.classroom,
      date: activeAtestadoDate.toISOString().split("T")[0],
      startDate: activeAtestadoDate.toISOString().split("T")[0],
      days: 5,
      endDate: activeEndDate.toISOString().split("T")[0],
      cid: "J11",
      motive: "Conjuntivite infecciosa",
      obs: "Atenção ao reintroduzir a criança na sala de aula pós conjuntivite.",
      filePreview: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23fef2f2' stroke='%23f87171' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23991b1b'>ATESTADO DE INFECÇÃO</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%23b91c1c'>Afastamento por Conjuntivite</text><line x1='50' y1='150' x2='250' y2='150' stroke='%23f87171' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23ef4444'>Pediatra Dr. Carlos CRM 5543</text></svg>`
    });
  }

  // Faltas recorrentes nas segundas para Gabriel Nogueira
  const gabriel = activeStudents.find(s => s.name === "Gabriel Nogueira");
  if (gabriel) {
    let count = 0;
    let d = new Date(today);
    while (count < 3) {
      d.setDate(d.getDate() - 1);
      if (d.getDay() === 1) { // 1 = Segunda
        records.push({
          id: `occ_recurrent_falta_gabriel_${count}`,
          type: 'falta',
          studentId: gabriel.id,
          studentName: gabriel.name,
          classroom: gabriel.classroom,
          date: d.toISOString().split("T")[0],
          motive: "Compromisso familiar / Viagem",
          justified: 'sim',
          notified: 'sim',
          obs: "Pais viajam frequentemente no final de semana prolongado."
        });
        count++;
      }
    }
  }

  const { data, error } = await supabase
    .from('occurrences')
    .insert(records)
    .select();
  if (error) {
    console.error('[Supabase] Erro ao semear massa de testes:', error);
    throw error;
  }
  return records.length;
}
