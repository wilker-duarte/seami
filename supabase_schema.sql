-- Script SQL para inicialização do banco de dados no Supabase SQL Editor
-- Copie e cole este script na seção SQL Editor do seu projeto Supabase.

-- 1. Criar Tabela de Alunos (students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  classroom TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- 2. Criar Tabela de Ocorrências (occurrences)
CREATE TABLE IF NOT EXISTS occurrences (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  "studentId" TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  classroom TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  motive TEXT,
  guardian TEXT,
  staff TEXT,
  obs TEXT,
  signature TEXT,
  justified TEXT,
  notified TEXT,
  "hasReturn" TEXT,
  "returnTime" TEXT,
  "timeIn" TEXT,
  "timeOut" TEXT,
  "startDate" TEXT,
  days INTEGER,
  "endDate" TEXT,
  cid TEXT,
  "filePreview" TEXT,
  "recordedBy" TEXT,
  "attachmentName" TEXT,
  "attachmentType" TEXT,
  "attachmentData" TEXT
);

-- 3. Criar Tabela de Presença (attendance)
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  "studentId" TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  classroom TEXT NOT NULL,
  status TEXT NOT NULL,
  "recordedBy" TEXT DEFAULT 'Professor'
);

-- 4. Criar Tabela de Configurações (settings)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 5. Criar Tabela de Equipe / Funcionários (staff)
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'diretora' (Secretaria) | 'pedagoga' | 'auxiliar'
  avatar TEXT NOT NULL DEFAULT '👩‍💼',
  "desc" TEXT
);

-- Desabilitar RLS (Row Level Security) para acesso anonizado completo
-- Como o app é de uso interno sem autenticação de usuários, isso permite leitura/escrita com a chave anon do Supabase.
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

-- Semear Funcionários Iniciais Padrões se não existirem
INSERT INTO staff (id, name, role, avatar, "desc") VALUES
  ('staff_1', 'Secretária Ana Clara', 'diretora', '👩‍💼', 'Acesso total e configurações'),
  ('staff_2', 'Pedagoga Marina', 'pedagoga', '👩‍🏫', 'Insights e relatórios pedagógicos'),
  ('staff_3', 'Auxiliar Jéssica', 'auxiliar', '👩', 'Apenas registro de ocorrências')
ON CONFLICT (id) DO NOTHING;
