import React, { useState } from 'react';

function MI({ name, style }: { name: string; style?: React.CSSProperties }) {
  return <span className="material-symbols-outlined" style={style}>{name}</span>;
}

interface Props { onLogin: (user: { name: string; email: string; role?: string }) => void; }

export default function Login({ onLogin }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  
  const [view, setView] = useState<'login' | 'forgot' | 'register'>('login');
  const [name, setName] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (view === 'login') {
      if (!email || !password) { setError('Por favor completa todos los campos.'); return; }
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));
      if (email === 'admin@nexus.com' && password === 'admin123') {
        onLogin({ name: 'Admin Principal', email, role: 'TENANT_ADMIN' });
      } else if (email === 'superadmin@nexus.com' && password === 'admin123') {
        onLogin({ name: 'Platform Super Admin', email, role: 'SUPER_ADMIN' });
      } else {
        setError('Credenciales incorrectas. Usa el acceso demo para continuar.');
        setLoading(false);
      }
    } else if (view === 'forgot') {
      if (!email) { setError('Por favor ingresa tu correo.'); return; }
      setLoading(true);
      await new Promise(r => setTimeout(r, 1000));
      setForgotSent(true);
      setLoading(false);
    } else if (view === 'register') {
      if (!name || !email || !password) { setError('Por favor completa todos los campos.'); return; }
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));
      setRegistered(true);
      setLoading(false);
      setTimeout(() => {
        onLogin({ name, email, role: 'TENANT_ADMIN' });
      }, 1500);
    }
  };

  const handleDemo = async (type: 'tenant' | 'superadmin') => {
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 800));
    if (type === 'superadmin') {
      onLogin({ name: 'Platform Super Admin', email: 'superadmin@nexus.com', role: 'SUPER_ADMIN' });
    } else {
      onLogin({ name: 'GC Corp', email: 'admin@nexus.com', role: 'TENANT_ADMIN' });
    }
  };

  return (
    <div className="login-root">
      {/* Left Panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-logo">
            <div className="login-brand-icon">
              <MI name="hexagon" style={{ color: 'white', fontSize: 24, fontVariationSettings: '"FILL" 1' }} />
            </div>
            <div>
              <div className="login-brand-name">Nexus AI</div>
              <div className="login-brand-tagline">Sales Automation Platform</div>
            </div>
          </div>

          <div className="login-hero-text">
            <h2>Vende más con<br />Inteligencia Artificial<br />en WhatsApp</h2>
            <p>
              Automatiza tu atención al cliente, gestiona pedidos en tiempo real
              y escala tu negocio con un agente IA entrenado en tu catálogo.
            </p>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            {['89%', '42', '+18%'].map((v, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === 2 ? 'white' : 'rgba(255,255,255,0.4)' }} />
            ))}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 4 }}>Métricas en vivo</span>
          </div>
          <div className="login-stats">
            <div className="login-stat">
              <div className="login-stat-value">89%</div>
              <div className="login-stat-label">IA sin agente</div>
            </div>
            <div className="login-stat">
              <div className="login-stat-value">42</div>
              <div className="login-stat-label">Chats activos</div>
            </div>
            <div className="login-stat">
              <div className="login-stat-value">+18%</div>
              <div className="login-stat-label">Ventas hoy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        {view === 'login' && (
          <div className="login-card">
            <div className="login-card-header">
              <h1>Bienvenido de vuelta</h1>
              <p>Inicia sesión en tu consola de administración</p>
            </div>
            {/* Demo Access */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button className="login-demo-btn" style={{ flex: 1, margin: 0 }} onClick={() => handleDemo('tenant')} disabled={loading}>
                <MI name="bolt" style={{ fontSize: 18 }} />
                {loading ? '...' : 'Demo Tenant'}
              </button>
              <button className="login-demo-btn" style={{ flex: 1, margin: 0, background: 'var(--color-primary-fixed-dim)', borderColor: 'var(--color-primary)' }} onClick={() => handleDemo('superadmin')} disabled={loading}>
                <MI name="admin_panel_settings" style={{ fontSize: 18 }} />
                {loading ? '...' : 'Demo Super Admin'}
              </button>
            </div>

            <div className="login-divider">o inicia sesión con email</div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-with-icon">
                  <MI name="mail" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', fontSize: 18 }} />
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@nexus.com"
                    style={{ paddingLeft: 40 }}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Contraseña</label>
                <div className="input-with-icon">
                  <MI name="lock" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', fontSize: 18 }} />
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingLeft: 40, paddingRight: 44 }}
                    autoComplete="current-password"
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}
                    style={{ right: 12, top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}>
                    <MI name={showPass ? 'visibility_off' : 'visibility'} style={{ fontSize: 18, color: 'var(--color-outline)' }} />
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="login-remember">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Recordarme
                </label>
                <a className="login-forgot" onClick={() => { setView('forgot'); setError(''); setForgotSent(false); }}>¿Olvidaste tu contraseña?</a>
              </div>

              {error && (
                <div style={{ background: 'var(--color-error-container)', border: '1px solid var(--color-error)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MI name="error" style={{ fontSize: 16 }} /> {error}
                </div>
              )}

              <button type="submit" className="btn-login" disabled={loading}>
                {loading
                  ? <><MI name="refresh" style={{ animation: 'spin 0.8s linear infinite' }} /> Iniciando sesión...</>
                  : <><MI name="login" /> Iniciar Sesión</>
                }
              </button>
            </form>

            <div className="login-footer">
              <p>Demo: <strong>admin@nexus.com</strong> (Tenant) o <strong>superadmin@nexus.com</strong> (Super Admin) / <strong>admin123</strong></p>
              <p style={{ marginTop: 8 }}>¿Nuevo en Nexus AI? <strong onClick={() => { setView('register'); setError(''); setRegistered(false); }} style={{ cursor: 'pointer', color: 'var(--color-secondary)' }}>Crear cuenta gratis</strong></p>
            </div>
          </div>
        )}

        {view === 'forgot' && (
          <div className="login-card">
            <div className="login-card-header">
              <h1>Recuperar Contraseña</h1>
              <p>Te enviaremos las instrucciones de restablecimiento</p>
            </div>

            {forgotSent ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 20 }}>
                <MI name="check_circle" style={{ fontSize: 48, color: 'var(--color-whatsapp-green)', marginBottom: 12 }} />
                <h3 style={{ color: 'var(--color-success-emerald)', fontWeight: 700, marginBottom: 8 }}>Enlace Enviado</h3>
                <p style={{ fontSize: 13, color: 'var(--color-slate-typography)', lineHeight: 1.5 }}>
                  Hemos enviado un correo a <strong>{email}</strong> con instrucciones para restablecer tu contraseña.
                </p>
                <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }} onClick={() => setView('login')}>
                  Volver al Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <div className="input-with-icon">
                    <MI name="mail" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', fontSize: 18 }} />
                    <input
                      className="form-input"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@nexus.com"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'var(--color-error-container)', border: '1px solid var(--color-error)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MI name="error" style={{ fontSize: 16 }} /> {error}
                  </div>
                )}

                <button type="submit" className="btn-login" style={{ marginBottom: 12 }} disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Enlace'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <a className="login-forgot" onClick={() => setView('login')} style={{ fontSize: 13, cursor: 'pointer' }}>Volver al inicio de sesión</a>
                </div>
              </form>
            )}
          </div>
        )}

        {view === 'register' && (
          <div className="login-card">
            <div className="login-card-header">
              <h1>Crear Cuenta Gratis</h1>
              <p>Inicia tu prueba de 14 días en Nexus AI</p>
            </div>

            {registered ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 20 }}>
                <MI name="celebration" style={{ fontSize: 48, color: 'var(--color-whatsapp-green)', marginBottom: 12 }} />
                <h3 style={{ color: 'var(--color-success-emerald)', fontWeight: 700, marginBottom: 8 }}>¡Registro Exitoso!</h3>
                <p style={{ fontSize: 13, color: 'var(--color-slate-typography)', lineHeight: 1.5 }}>
                  Tu cuenta ha sido creada. Iniciando sesión en tu panel...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <div className="input-with-icon">
                    <MI name="person" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', fontSize: 18 }} />
                    <input
                      className="form-input"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Juan Pérez"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <div className="input-with-icon">
                    <MI name="mail" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', fontSize: 18 }} />
                    <input
                      className="form-input"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="juan@ejemplo.com"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <div className="input-with-icon">
                    <MI name="lock" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)', fontSize: 18 }} />
                    <input
                      className="form-input"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Crea una contraseña"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'var(--color-error-container)', border: '1px solid var(--color-error)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MI name="error" style={{ fontSize: 16 }} /> {error}
                  </div>
                )}

                <button type="submit" className="btn-login" style={{ marginBottom: 12 }} disabled={loading}>
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <a className="login-forgot" onClick={() => setView('login')} style={{ fontSize: 13, cursor: 'pointer' }}>¿Ya tienes cuenta? Inicia sesión</a>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
