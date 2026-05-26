import React, { useState } from 'react';
import { Mail, Lock, Sparkles, Eye, EyeOff } from 'lucide-react';
import { signIn, getPessoas } from '../supabaseClient';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);

    try {
      // MODO LOGIN UNIFICADO E RESTRETO
      console.log('[Login] Iniciando signIn...');
      const authData = await signIn(email.trim(), password);
      console.log('[Login] signIn finalizado:', authData);
      if (authData?.user) {
        // Busca o perfil completo na tabela pessoas
        console.log('[Login] Buscando pessoas...');
        const allPessoas = await getPessoas();
        console.log('[Login] getPessoas finalizado:', allPessoas);
        const profile = allPessoas.find(p => p.email?.toLowerCase() === email.trim().toLowerCase());
        console.log('[Login] Perfil encontrado:', profile);
        
        if (profile) {
          onLoginSuccess({
            role: profile.type === 'secretaria' ? 'diretora' : profile.type, // 'diretora' | 'pedagoga' | 'auxiliar'
            name: profile.name,
            avatar: profile.avatar || '👩‍💼',
            email: profile.email
          });
        } else {
          // Se o perfil na tabela pública falhou por RLS mas o Auth logou, cria um fallback temporário dos metadados de Auth
          const metadata = authData.user.user_metadata || {};
          const userRole = metadata.role || 'auxiliar';
          onLoginSuccess({
            role: userRole,
            name: metadata.name || 'Usuário Escola',
            avatar: userRole === 'diretora' ? '👩‍💼' : '👩',
            email: authData.user.email
          });
        }
      }
    } catch (err) {
      console.error('[Login] Erro no fluxo de login:', err);
      const msg = err.message || err.details || '';
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('E-mail ou senha incorretos. Tente novamente.');
      } else {
        setErrorMessage(msg || 'Ocorreu um erro ao processar a solicitação.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      fontFamily: 'Outfit, sans-serif',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Blur Spheres */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)',
        borderRadius: '50%',
        zIndex: 0
      }} />

      {/* Glassmorphic Login Card */}
      <div className="login-card" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: '24px',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05)',
        padding: '40px',
        zIndex: 1,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}>
        {/* Logo Container */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            fontSize: '48px',
            display: 'inline-block',
            marginBottom: '12px',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))'
          }}>🧸</span>
          <h1 style={{
            fontSize: '26px',
            fontWeight: '800',
            color: 'var(--slate-800)',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>EducaGestão</h1>
          <p style={{
            fontSize: '13px',
            color: 'var(--slate-500)',
            margin: '4px 0 0 0'
          }}>Portal Creche — Acesso Restrito à Equipe</p>
        </div>

        {/* Dynamic Alert Messages */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-700)', marginBottom: '6px', display: 'block' }}>Endereço de E-mail*</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input 
                type="email" 
                required
                placeholder="exemplo@seami.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-700)', marginBottom: '6px', display: 'block' }}>Senha*</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: 'var(--slate-800)',
                  outline: 'none'
                }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--slate-400)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="primary-btn"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? (
              <span>Carregando...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
