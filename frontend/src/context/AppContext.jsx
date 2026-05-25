import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStudents, getSettings, saveSettings } from '../supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeUser, setActiveUserState] = useState({
    role: 'diretora',
    name: 'Diretora Ana Clara',
    avatar: '👩‍💼'
  });
  const [isDark, setIsDark] = useState(false);
  const [students, setStudents] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Carrega configurações e alunos na inicialização
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [studentsData, settingsData] = await Promise.all([
          getStudents(),
          getSettings()
        ]);

        setStudents(studentsData || []);

        if (settingsData && settingsData.activeRole) {
          setActiveUserState({
            role: settingsData.activeRole,
            name: settingsData.activeUserName || 'Diretora Ana Clara',
            avatar: settingsData.activeUserAvatar || '👩‍💼'
          });
        }
        if (settingsData && settingsData.theme) {
          setIsDark(settingsData.theme === 'dark');
        }
      } catch (err) {
        console.error('[AppContext] Erro ao carregar dados iniciais do Supabase:', err);
      } finally {
        setIsBootstrapping(false);
      }
    };
    bootstrap();
  }, []);

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

  // Persiste o usuário ativo no Supabase
  const setActiveUser = async (user) => {
    setActiveUserState(user);
    try {
      await saveSettings({
        activeRole: user.role,
        activeUserName: user.name,
        activeUserAvatar: user.avatar
      });
    } catch (err) {
      console.error('[AppContext] Erro ao salvar usuário no Supabase:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      activeUser,
      setActiveUser,
      isDark,
      setIsDark,
      students,
      setStudents,
      isBootstrapping
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

