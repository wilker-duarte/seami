import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStudents, getSettings, saveSettings, getTurmas } from '../supabaseClient';

const AppContext = createContext(null);

// Usuário padrão fixo — sem autenticação
const DEFAULT_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Secretaria SEAMI',
  type: 'secretaria',
  role: 'diretora',
  email: 'wilker@seami.com',
  avatar: '👩‍💼',
  active: true
};

export function AppProvider({ children }) {
  const [activeUser, setActiveUser] = useState(DEFAULT_USER);
  const [isDark, setIsDark] = useState(false);
  const [students, setStudents] = useState([]);
  const [recessPeriods, setRecessPeriods] = useState([]);
  const [turmasList, setTurmasList] = useState([
    { id: '1', name: 'Alegria',    age_group: '0 a 1 ano (Berçário I)' },
    { id: '2', name: 'Carinho',    age_group: '1 a 2 anos (Berçário II)' },
    { id: '3', name: 'União',      age_group: '2 a 3 anos (Maternal I)' },
    { id: '4', name: 'Amizade',    age_group: '3 a 4 anos (Maternal II)' },
    { id: '5', name: 'Felicidade', age_group: '4 a 5 anos (Pré-Escola)' }
  ]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Carrega dados da plataforma ao iniciar (sem login)
  useEffect(() => {
    loadAppData().finally(() => setIsBootstrapping(false));
  }, []);

  const loadAppData = async () => {
    try {
      const [studentsData, settingsData, turmasData] = await Promise.all([
        getStudents(),
        getSettings(),
        getTurmas()
      ]);

      setStudents(studentsData || []);

      if (turmasData && turmasData.length > 0) {
        setTurmasList(turmasData);
      }

      if (settingsData) {
        if (settingsData.theme) {
          setIsDark(settingsData.theme === 'dark');
        }
        if (settingsData.recess_periods) {
          try {
            setRecessPeriods(JSON.parse(settingsData.recess_periods));
          } catch (e) {
            console.error('[AppContext] Erro ao analisar recessos e feriados:', e);
            setRecessPeriods([]);
          }
        } else {
          setRecessPeriods([]);
        }
      }
    } catch (err) {
      console.error('[AppContext] Erro ao carregar dados:', err);
    }
  };

  // Sincroniza tema com o body e salva no Supabase
  useEffect(() => {
    const body = document.body;
    if (isDark) {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
    }
    if (!isBootstrapping) {
      saveSettings({ theme: isDark ? 'dark' : 'light' }).catch(() => {});
    }
  }, [isDark, isBootstrapping]);

  return (
    <AppContext.Provider value={{
      activeUser,
      setActiveUser,
      isDark,
      setIsDark,
      students,
      setStudents,
      recessPeriods,
      setRecessPeriods,
      turmasList,
      setTurmasList,
      isBootstrapping,
      reloadAppData: loadAppData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de <AppProvider>');
  return ctx;
}
