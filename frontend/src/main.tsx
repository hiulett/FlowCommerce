import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './Login'
import './index.css'

interface User { name: string; email: string; role?: string; }

function Root() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('nexus_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleLogin = (u: User) => {
    sessionStorage.setItem('nexus_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nexus_user');
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;
  return <App user={user} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
