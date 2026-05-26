import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não definidos!');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Mapeamento local das turmas para compatibilidade visual imediata
const classesNameMap = {
  '1': 'Alegria',
  '2': 'Carinho',
  '3': 'União',
  '4': 'Amizade',
  '5': 'Felicidade'
};

const classesIdMap = {
  'Alegria': '1',
  'Carinho': '2',
  'União': '3',
  'Amizade': '4',
  'Felicidade': '5'
};

// ==========================================
// UTILITÁRIO DE SANITIZAÇÃO DE ENTRADAS
// ==========================================

export function sanitizeInput(str) {
  if (str === undefined || str === null) return '';
  if (typeof str !== 'string') return String(str);
  // Remove tags HTML/JS para evitar ataques XSS
  return str
    .replace(/<[^>]*>/g, '')
    .trim();
}

// ==========================================
// MÉTODOS DE AUTENTICAÇÃO REAL (SUPABASE AUTH)
// ==========================================

export async function signIn(email, password) {
  const cleanEmail = sanitizeInput(email);
  console.log('[Supabase Client] signIn chamado com:', { email: cleanEmail });
  
  // Limpeza proativa de qualquer lock ou sessão anterior concorrente para impedir travamentos de concorrência do GoTrue
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('seami-auth-token');
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.endsWith('-lock') || key.includes('auth-token-lock') || key.includes('seami-auth'))) {
          window.localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('[Supabase Client] Falha ao efetuar limpeza proativa antes do login:', e);
    }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });
    console.log('[Supabase Client] signIn retorno:', { data, error });
    if (error) {
      console.error('[Supabase Auth] Erro ao autenticar:', error.message);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[Supabase Client] signIn capturou erro:', err);
    throw err;
  }
}

export async function signUp({ email, password, name, role, description = '' }) {
  const cleanEmail = sanitizeInput(email);
  const cleanName = sanitizeInput(name);
  const cleanDesc = sanitizeInput(description);
  
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: cleanName,
        role: role
      }
    }
  });

  if (error) {
    console.error('[Supabase Auth] Erro ao criar conta:', error.message);
    throw error;
  }

  // Cria o registro correspondente na tabela public.pessoas para visibilidade do app
  if (data?.user) {
    const { error: dbErr } = await supabase.from('pessoas').insert({
      id: data.user.id,
      name: cleanName,
      type: role,
      active: true,
      avatar: role === 'diretora' ? '👩‍💼' : role === 'pedagoga' ? '👩‍🏫' : '👩',
      description: cleanDesc,
      email: cleanEmail
    });
    
    if (dbErr) {
      console.error('[Supabase] Erro ao espelhar perfil de usuário:', dbErr.message);
      throw dbErr;
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase Auth] Erro no logout:', error.message);
    throw error;
  }
  return true;
}

export async function getCurrentUserProfile(email) {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) {
    console.error('[Supabase] Erro ao obter perfil de usuário:', error.message);
    throw error;
  }
  
  return {
    ...data,
    role: data.type === 'secretaria' ? 'diretora' : data.type, // Map para compatibilidade
    desc: data.description // Map para compatibilidade
  };
}

// ==========================================
// MÉTODOS DE TURMAS
// ==========================================

export async function getTurmas() {
  const { data, error } = await supabase
    .from('turmas')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('[Supabase] Erro ao obter turmas:', error.message);
    throw error;
  }
  return data;
}

export async function saveTurma(turma) {
  const payload = {
    id: turma.id || String(Date.now() + Math.floor(Math.random() * 1000)),
    name: sanitizeInput(turma.name),
    age_group: sanitizeInput(turma.age_group)
  };
  const { data, error } = await supabase
    .from('turmas')
    .upsert(payload)
    .select()
    .single();
  
  if (error) {
    console.error('[Supabase] Erro ao salvar turma:', error.message);
    throw error;
  }
  return data;
}

export async function deleteTurma(id) {
  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[Supabase] Erro ao deletar turma:', error.message);
    throw error;
  }
  return true;
}

// ==========================================
// MÉTODOS DE PESSOAS (ALUNOS E EQUIPE UNIFICADA)
// ==========================================

export async function getPessoas(type) {
  let query = supabase.from('pessoas').select('*').order('name');
  if (type) {
    query = query.eq('type', type);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] Erro ao obter pessoas:', error.message);
    throw error;
  }
  return data;
}

export async function getStudents() {
  const alumnos = await getPessoas('aluno');
  return alumnos.map(a => ({
    ...a,
    studentId: a.id, // Compatibilidade
    classroom: classesNameMap[a.turma_id] || 'Alegria', // Compatibilidade visual
    shift: a.shift || 'integral'
  }));
}

export async function saveStudent(student) {
  const turmaId = student.turma_id || classesIdMap[student.classroom] || '1';
  const payload = {
    id: student.id || String(Date.now() + Math.floor(Math.random() * 1000)),
    name: sanitizeInput(student.name),
    type: 'aluno',
    active: student.active ?? true,
    avatar: '👦',
    turma_id: turmaId,
    shift: student.shift || 'integral'
  };
  
  const { data, error } = await supabase
    .from('pessoas')
    .upsert(payload)
    .select()
    .single();
  
  if (error) {
    console.error('[Supabase] Erro ao salvar aluno:', error.message);
    throw error;
  }

  return {
    ...data,
    classroom: classesNameMap[data.turma_id] || 'Alegria',
    shift: data.shift || 'integral'
  };
}

export async function toggleStudentActive(studentId) {
  const { data: student, error: getErr } = await supabase
    .from('pessoas')
    .select('active')
    .eq('id', studentId)
    .single();
  if (getErr) {
    console.error('[Supabase] Erro ao obter status do aluno:', getErr.message);
    throw getErr;
  }

  const { data, error } = await supabase
    .from('pessoas')
    .update({ active: !student.active })
    .eq('id', studentId)
    .select()
    .single();
  
  if (error) {
    console.error('[Supabase] Erro ao alternar status do aluno:', error.message);
    throw error;
  }

  return {
    ...data,
    classroom: classesNameMap[data.turma_id] || 'Alegria'
  };
}

export async function deleteStudent(studentId) {
  const { error } = await supabase
    .from('pessoas')
    .delete()
    .eq('id', studentId);
  if (error) {
    console.error('[Supabase] Erro ao deletar aluno:', error.message);
    throw error;
  }
  return true;
}

export async function saveStudentBulk(studentsArray) {
  // 1. Busca todos os alunos existentes no banco para checar duplicatas por nome
  const { data: existingPessoas, error: getErr } = await supabase
    .from('pessoas')
    .select('*')
    .eq('type', 'aluno');
    
  if (getErr) throw getErr;
  
  const existingMap = new Map();
  existingPessoas?.forEach(p => {
    existingMap.set(p.name.trim().toLowerCase(), p);
  });

  const records = studentsArray.map((s, index) => {
    const normName = s.name.trim().toLowerCase();
    const existing = existingMap.get(normName);
    const turmaId = s.turma_id || classesIdMap[s.classroom] || '1';
    
    return {
      id: existing ? existing.id : (s.id || String(Date.now() + Math.floor(Math.random() * 1000) + index)),
      name: sanitizeInput(s.name),
      type: 'aluno',
      active: s.active ?? true,
      avatar: '👦',
      turma_id: turmaId,
      shift: s.shift || existing?.shift || 'integral'
    };
  });
  
  const { data, error } = await supabase
    .from('pessoas')
    .upsert(records)
    .select();
  
  if (error) {
    console.error('[Supabase] Erro na importação de alunos:', error.message);
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
    console.error('[Supabase] Erro ao obter ocorrências:', error.message);
    throw error;
  }
  return data.map(o => ({
    ...o,
    studentId: o.student_id,
    studentName: o.studentname || o.studentName || '',  // normaliza nome da coluna
    classroom: classesNameMap[o.turma_id] || o.classroom || 'Alegria'
  }));
}


export async function saveOccurrence(occ) {
  const id = occ.id || String(Date.now() + Math.floor(Math.random() * 1000));
  const turmaId = occ.turma_id || classesIdMap[occ.classroom] || '1';
  
  const payload = {
    id,
    type: occ.type,
    student_id: occ.studentId || occ.student_id,
    turma_id: turmaId,
    studentname: sanitizeInput(occ.studentName || occ.studentname),  // coluna: studentname
    classroom: classesNameMap[turmaId] || occ.classroom || 'Alegria',
    date: occ.date,
    time: occ.time || null,
    motive: sanitizeInput(occ.motive || null),
    guardian: sanitizeInput(occ.guardian || null),
    staff: sanitizeInput(occ.staff || null),
    obs: sanitizeInput(occ.obs || null),
    signature: occ.signature || null,
    justified: occ.justified || null,
    notified: occ.notified || null,
    hasReturn: occ.hasReturn || null,       // coluna: "hasReturn"
    returnTime: occ.returnTime || null,     // coluna: "returnTime"
    timeIn: occ.timeIn || null,             // coluna: "timeIn"
    timeOut: occ.timeOut || null,           // coluna: "timeOut"
    startDate: occ.startDate || null,       // coluna: "startDate"
    days: occ.days ? parseInt(occ.days) : null,
    endDate: occ.endDate || null,           // coluna: "endDate"
    cid: sanitizeInput(occ.cid || null),
    filePreview: occ.filePreview || null,   // coluna: "filePreview"
    recordedBy: sanitizeInput(occ.recordedBy || null),  // coluna: "recordedBy"
    attachmentName: occ.attachmentName || null,         // coluna: "attachmentName"
    attachmentType: occ.attachmentType || null,         // coluna: "attachmentType"
    attachmentData: occ.attachmentData || null          // coluna: "attachmentData"
  };

  console.log('[saveOccurrence] Salvando tipo:', payload.type, '| student_id:', payload.student_id);

  const { data, error } = await supabase
    .from('occurrences')
    .upsert(payload)
    .select()
    .single();
  if (error) {
    console.error('[Supabase] Erro ao salvar ocorrência:', error.message, '| code:', error.code, '| details:', error.details);
    throw error;
  }
  return {
    ...data,
    studentId: data.student_id,
    studentName: data.studentname,  // normaliza de volta para o app
    classroom: classesNameMap[data.turma_id] || data.classroom || 'Alegria'
  };
}


export async function deleteOccurrence(id) {
  const { error } = await supabase
    .from('occurrences')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[Supabase] Erro ao deletar ocorrência:', error.message);
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
    const tId = classesIdMap[filters.classroom] || filters.classroom;
    query = query.eq('turma_id', tId);
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
    console.error('[Supabase] Erro ao buscar chamada:', error.message);
    throw error;
  }
  return data.map(a => ({
    ...a,
    studentId: a.student_id,
    classroom: classesNameMap[a.turma_id] || a.classroom || 'Alegria'
  }));
}

export async function saveAttendanceBulk({ date, classroom, recordedBy, records }) {
  const fallbackTId = classesIdMap[classroom] || '1';
  const dbRecords = records.map(r => {
    const studentId = r.studentId || r.student_id;
    // Usa o turma_id individual do aluno; só usa fallback se não vier
    const tId = r.turma_id || fallbackTId;
    const cleanDate = date.replace(/-/g, '');
    return {
      id: `${studentId}${cleanDate}`,
      date,
      student_id: studentId,
      turma_id: tId,
      studentname: sanitizeInput(r.studentName || r.name),
      classroom: r.classroom || classesNameMap[tId] || classroom,
      status: r.status,
      recordedBy: sanitizeInput(recordedBy || 'Professor')
    };
  });

  console.log('[saveAttendanceBulk] Enviando', dbRecords.length, 'registros | data:', date);

  const { data, error } = await supabase
    .from('attendance')
    .upsert(dbRecords, { onConflict: 'id' })
    .select();
  if (error) {
    console.error('[Supabase] Erro ao salvar chamada em lote:', error.message, '| Detalhes:', error.details, '| Hint:', error.hint, '| Code:', error.code);
    throw error;
  }
  return data.map(a => ({
    ...a,
    studentId: a.student_id,
    classroom: classesNameMap[a.turma_id] || a.classroom || 'Alegria'
  }));
}

// ==========================================
// MÉTODOS DE CONFIGURAÇÕES (SETTINGS)
// ==========================================

export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*');
  if (error) {
    console.error('[Supabase] Erro ao obter configurações:', error.message);
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
    console.error('[Supabase] Erro ao salvar configurações:', error.message);
    throw error;
  }
  return data;
}

// ==========================================
// MÉTODOS DE MANUTENÇÃO E GESTÃO
// ==========================================

export async function wipeHistory() {
  const { error } = await supabase
    .from('occurrences')
    .delete()
    .neq('id', '');
  if (error) {
    console.error('[Supabase] Erro ao limpar histórico de ocorrências:', error.message);
    throw error;
  }
  return true;
}

export async function resetDatabase() {
  // Limpa tudo por completo respeitando constraints relacionais
  const deleteOcc = supabase.from('occurrences').delete().neq('id', '');
  const deleteAtt = supabase.from('attendance').delete().neq('id', '');
  const deleteTC = supabase.from('turma_cuidadores').delete().neq('turma_id', '');
  
  await Promise.all([deleteOcc, deleteAtt, deleteTC]);

  // Limpa apenas alunos para manter cuidadores autenticados intactos
  await supabase.from('pessoas').delete().eq('type', 'aluno');

  // Restaura configurações padrões
  await saveSettings({
    theme: 'light',
    activeRole: 'diretora',
    activeUserName: 'Secretária Ana Clara',
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
    const tId = student.turma_id || '1';

    if (randType < 0.40) {
      // ATRASO
      const hour = "08:" + String(Math.floor(Math.random() * 45) + 15).padStart(2, "0");
      const motive = atrasosMotivos[Math.floor(Math.random() * atrasosMotivos.length)];
      records.push({
        id: occId,
        type: 'atraso',
        student_id: student.id,
        turma_id: tId,
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
        student_id: student.id,
        turma_id: tId,
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
        student_id: student.id,
        turma_id: tId,
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
        student_id: student.id,
        turma_id: tId,
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
        student_id: student.id,
        turma_id: tId,
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
      student_id: karina.id,
      turma_id: karina.turma_id,
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
          student_id: gabriel.id,
          turma_id: gabriel.turma_id,
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
    console.error('[Supabase] Erro ao semear massa de testes:', error.message);
    throw error;
  }
  return records.length;
}

// ==========================================
// MÉTODOS DE EQUIPE / FUNCIONÁRIOS (STAFF)
// ==========================================

export async function getStaff() {
  try {
    const all = await getPessoas();
    return all
      .filter(p => p.type !== 'aluno')
      .map(member => ({
        ...member,
        role: member.type, // Map para compatibilidade
        desc: member.description || '' // Map para compatibilidade
      }));
  } catch (err) {
    console.warn('[Supabase] Falha ao obter equipe. Usando equipe padrão.', err);
    return [
      { id: '1', name: 'Secretária Ana Clara', role: 'diretora', avatar: '👩‍💼', desc: 'Acesso total e configurações', type: 'secretaria' },
      { id: '2', name: 'Pedagoga Marina', role: 'pedagoga', avatar: '👩‍🏫', desc: 'Insights e relatórios pedagógicos', type: 'pedagoga' },
      { id: '3', name: 'Auxiliar Jéssica', role: 'auxiliar', avatar: '👩', desc: 'Apenas registro de ocorrências', type: 'auxiliar' }
    ];
  }
}

export async function saveStaff(member) {
  const payload = {
    id: member.id || String(Date.now() + Math.floor(Math.random() * 1000)),
    name: sanitizeInput(member.name),
    type: member.role || 'auxiliar',
    avatar: member.avatar || '👩‍💼',
    description: sanitizeInput(member.desc || ''),
    active: true
  };
  
  try {
    const { data, error } = await supabase
      .from('pessoas')
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.warn('[Supabase] Erro ao salvar funcionário no banco. Simulando local.', error.message);
      return {
        ...payload,
        role: payload.type,
        desc: payload.description
      };
    }
    return {
      ...data,
      role: data.type,
      desc: data.description
    };
  } catch (err) {
    console.warn('[Supabase] Falha ao salvar funcionário. Simulando local.', err);
    return {
      ...payload,
      role: payload.type,
      desc: payload.description
    };
  }
}

export async function deleteStaff(id) {
  try {
    const { error } = await supabase
      .from('pessoas')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('[Supabase] Erro ao deletar funcionário no banco. Simulando local.', error.message);
      return true;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Falha ao deletar funcionário. Simulando local.', err);
    return true;
  }
}
