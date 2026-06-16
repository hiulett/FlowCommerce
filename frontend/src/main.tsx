import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function App() {
  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>FlowCommerce Console</h1>
        <span className="badge">Multi-Tenant Admin</span>
      </header>
      <main className="admin-content">
        <h2>Plataforma de Ventas por WhatsApp e IA</h2>
        <p>Bienvenido al esqueleto base de la consola de administración. Aquí podrás configurar tus tiendas y catálogos.</p>
        <div className="card">
          <h3>Tenants Conectados</h3>
          <p>Estado del servicio: <strong>Activo</strong></p>
        </div>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
