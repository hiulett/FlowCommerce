import React, { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'ai-knowledge' | 'orders' | 'customers' | 'settings';
type SettingsTab = 'business-profile' | 'team-management' | 'whatsapp-integration' | 'billing-security';
type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'DELIVERED';
type CustomerStatus = 'ACTIVE' | 'INACTIVE';

interface OrderItem { name: string; quantity: number; price: number; }
interface Order {
  id: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  total: number;
  createdAt: Date;
  status: OrderStatus;
  notes?: string;
  paymentMethod: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  totalSpend: number;
  status: CustomerStatus;
  joinDate: string;
  initials: string;
  avatarColor: string;
}

interface KBDocument {
  id: string;
  title: string;
  type: 'FAQ' | 'CATALOG' | 'POLICY' | 'PROMO';
  wordCount: number;
  lastUpdated: string;
  status: 'TRAINED' | 'PENDING';
}

// ─── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C001', name: 'Isaac Mendoza', phone: '+57 300 123 4567', email: 'i.mendoza@email.com', totalOrders: 14, totalSpend: 287.40, status: 'ACTIVE', joinDate: '2026-03-12', initials: 'IM', avatarColor: '#e2dfff' },
  { id: 'C002', name: 'Laura Gómez', phone: '+57 312 987 6543', email: 'lgomez@email.com', totalOrders: 8, totalSpend: 144.00, status: 'ACTIVE', joinDate: '2026-04-05', initials: 'LG', avatarColor: '#d1fae5' },
  { id: 'C003', name: 'Carlos Ruiz', phone: '+57 315 555 4433', totalOrders: 3, totalSpend: 52.50, status: 'INACTIVE', joinDate: '2026-05-20', initials: 'CR', avatarColor: '#dbeafe' },
  { id: 'C004', name: 'Sofía Silva', phone: '+57 300 999 8877', email: 'ssilva@biz.com', totalOrders: 22, totalSpend: 498.75, status: 'ACTIVE', joinDate: '2026-02-01', initials: 'SS', avatarColor: '#fde68a' },
  { id: 'C005', name: 'Andrés Medina', phone: '+57 301 234 5678', totalOrders: 5, totalSpend: 89.00, status: 'ACTIVE', joinDate: '2026-04-18', initials: 'AM', avatarColor: '#ffdbc7' },
];

const MOCK_KB: KBDocument[] = [
  { id: 'KB001', title: 'Menú Principal y Precios 2026', type: 'CATALOG', wordCount: 1240, lastUpdated: '2026-06-15', status: 'TRAINED' },
  { id: 'KB002', title: 'Preguntas Frecuentes - Delivery', type: 'FAQ', wordCount: 680, lastUpdated: '2026-06-10', status: 'TRAINED' },
  { id: 'KB003', title: 'Política de Devoluciones', type: 'POLICY', wordCount: 320, lastUpdated: '2026-05-28', status: 'TRAINED' },
  { id: 'KB004', title: 'Promociones Junio 2026', type: 'PROMO', wordCount: 410, lastUpdated: '2026-06-16', status: 'PENDING' },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function MaterialIcon({ name, filled = false, style }: { name: string; filled?: boolean; style?: React.CSSProperties }) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' filled' : ''}`}
      style={style}
    >
      {name}
    </span>
  );
}

function NavItem({
  icon, label, active, onClick, badge,
}: {
  icon: string; label: string; active?: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
      <MaterialIcon name={icon} filled={active} />
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="nav-badge">{badge}</span>
      )}
    </button>
  );
}

// ─── Dashboard View ────────────────────────────────────────────────────────
function DashboardView({ orders }: { orders: Order[] }) {
  const todayRevenue = orders
    .filter(o => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Dashboard</h2>
          <p>
            <MaterialIcon name="chat" />
            Resumen en tiempo real de tus ventas por WhatsApp
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <MaterialIcon name="download" /> Exportar
          </button>
          <button className="btn btn-primary">
            <MaterialIcon name="auto_awesome" /> Reporte IA
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon indigo"><MaterialIcon name="payments" filled /></div>
          <div>
            <div className="stat-label">Ventas Hoy</div>
            <div className="stat-value">$348.90</div>
            <div className="stat-change up">
              <MaterialIcon name="trending_up" /> +18% vs ayer
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MaterialIcon name="shopping_cart" filled /></div>
          <div>
            <div className="stat-label">Pedidos Totales</div>
            <div className="stat-value">{orders.length + 15}</div>
            <div className="stat-change up">
              <MaterialIcon name="trending_up" /> +5 nuevos
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><MaterialIcon name="forum" filled /></div>
          <div>
            <div className="stat-label">Chats IA Activos</div>
            <div className="stat-value">42</div>
            <div className="stat-change up">
              <MaterialIcon name="trending_up" /> 89% resueltos
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MaterialIcon name="group" filled /></div>
          <div>
            <div className="stat-label">Nuevos Clientes</div>
            <div className="stat-value">9</div>
            <div className="stat-change up">
              <MaterialIcon name="trending_up" /> Esta semana
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="nexus-indicator" />
          <div className="card-body">
            <div className="section-title">
              <MaterialIcon name="bar_chart" /> Ventas por Canal (WhatsApp IA)
            </div>
            <div className="bar-chart">
              <div className="bar-chart-bar" style={{ height: '35%', background: '#312e81' }} title="Semana 1: $120" />
              <div className="bar-chart-bar" style={{ height: '55%', background: '#312e81' }} title="Semana 2: $190" />
              <div className="bar-chart-bar" style={{ height: '78%', background: '#312e81' }} title="Semana 3: $265" />
              <div className="bar-chart-bar" style={{ height: '100%', background: '#2170e4' }} title="Hoy: $349" />
            </div>
            <div className="bar-chart-labels">
              <span>Sem 1</span><span>Sem 2</span><span>Sem 3</span><span>Hoy ✦</span>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="card">
          <div className="nexus-indicator" />
          <div className="card-body">
            <div className="section-title">
              <MaterialIcon name="insights" /> Métricas de Rendimiento IA
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-header">
                <span className="progress-bar-label">Precisión IA (Resueltos sin agente)</span>
                <span className="progress-bar-value">89%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '89%', background: 'var(--color-whatsapp-green)' }} />
              </div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-header">
                <span className="progress-bar-label">Tasa de Conversión WhatsApp</span>
                <span className="progress-bar-value">24.5%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '24.5%', background: 'var(--color-secondary-container)' }} />
              </div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-header">
                <span className="progress-bar-label">Tiempo Medio de Despacho</span>
                <span className="progress-bar-value">12.4 min</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '75%', background: 'var(--color-primary)' }} />
              </div>
            </div>
            <div className="progress-bar-wrap" style={{ marginBottom: 0 }}>
              <div className="progress-bar-header">
                <span className="progress-bar-label">Satisfacción del Cliente</span>
                <span className="progress-bar-value">96%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '96%', background: '#f59e0b' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card">
        <div className="nexus-indicator" />
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="section-title">
            <MaterialIcon name="receipt_long" /> Últimos Pedidos WhatsApp
          </div>
        </div>
        <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th><th>Cliente</th><th>Productos</th>
                <th style={{ textAlign: 'right' }}>Total</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(o => (
                <tr key={o.id}>
                  <td><span className="font-mono" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>#{o.id}</span></td>
                  <td style={{ fontWeight: 600 }}>{o.customerName}</td>
                  <td style={{ color: 'var(--color-on-surface-variant)' }}>{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>${o.total.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${
                      o.status === 'NEW' ? 'badge-new' :
                      o.status === 'PREPARING' ? 'badge-preparing' :
                      o.status === 'READY' ? 'badge-ready' : 'badge-delivered'
                    }`}>
                      {o.status === 'NEW' ? 'Nuevo' : o.status === 'PREPARING' ? 'Preparando' : o.status === 'READY' ? 'Listo' : 'Entregado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AI Knowledge Base View ────────────────────────────────────────────────
function AIKnowledgeView() {
  const [docs, setDocs] = useState<KBDocument[]>(MOCK_KB);
  const [systemPrompt, setSystemPrompt] = useState(
    'Eres un asistente virtual de ventas oficial para FlowCommerce. Tu tono es amigable y profesional. Solo recomiendas productos del catálogo adjunto. Si no puedes responder algo, deriva educadamente al agente humano.'
  );

  const typeLabels: Record<KBDocument['type'], string> = {
    FAQ: 'Preguntas Frecuentes', CATALOG: 'Catálogo', POLICY: 'Política', PROMO: 'Promoción',
  };
  const typeColors: Record<KBDocument['type'], string> = {
    FAQ: 'badge-new', CATALOG: 'badge-active', POLICY: 'badge-delivered', PROMO: 'badge-preparing',
  };
  const kbIcons: Record<KBDocument['type'], string> = {
    FAQ: 'quiz', CATALOG: 'menu_book', POLICY: 'policy', PROMO: 'sell',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>AI Knowledge Base</h2>
          <p>
            <MaterialIcon name="psychology" />
            Base de conocimiento que alimenta al asistente IA de WhatsApp
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary">
            <MaterialIcon name="upload_file" /> Cargar Documento
          </button>
          <button className="btn btn-secondary">
            <MaterialIcon name="auto_awesome" /> Entrenar Modelo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Documentos', value: docs.length.toString(), icon: 'description', color: 'indigo' },
          { label: 'Entrenados', value: docs.filter(d => d.status === 'TRAINED').length.toString(), icon: 'check_circle', color: 'green' },
          { label: 'Pendientes', value: docs.filter(d => d.status === 'PENDING').length.toString(), icon: 'pending', color: 'orange' },
          { label: 'Palabras Totales', value: docs.reduce((s, d) => s + d.wordCount, 0).toLocaleString(), icon: 'text_fields', color: 'blue' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><MaterialIcon name={s.icon} filled /></div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Documents list */}
        <div className="card">
          <div className="nexus-indicator" />
          <div className="card-body">
            <div className="section-title"><MaterialIcon name="folder_open" /> Documentos de Conocimiento</div>
            <div className="space-y">
              {docs.map(doc => (
                <div key={doc.id} className="kb-card">
                  <div className="kb-card-header">
                    <div className={`kb-icon ${doc.type === 'CATALOG' ? 'indigo' : doc.type === 'PROMO' ? 'orange' : doc.type === 'POLICY' ? 'blue' : 'green'}`}>
                      <MaterialIcon name={kbIcons[doc.type]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-on-surface)', marginBottom: 2 }}>{doc.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${typeColors[doc.type]}`}>{typeLabels[doc.type]}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{doc.wordCount.toLocaleString()} palabras</span>
                      </div>
                    </div>
                    <span className={`badge ${doc.status === 'TRAINED' ? 'badge-active' : 'badge-preparing'}`}>
                      {doc.status === 'TRAINED' ? '✓ Entrenado' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-outline)' }}>
                      <MaterialIcon name="schedule" style={{ fontSize: 13, verticalAlign: 'middle' }} /> Actualizado: {doc.lastUpdated}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                        <MaterialIcon name="edit" style={{ fontSize: 15 }} /> Editar
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                        <MaterialIcon name="delete" style={{ fontSize: 15 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="nexus-indicator" />
            <div className="card-body">
              <div className="section-title"><MaterialIcon name="smart_toy" /> System Prompt del Agente IA</div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Instrucciones Maestras</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                />
                <div className="form-hint">Este prompt define la personalidad, contexto e instrucciones del agente de WhatsApp.</div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                <MaterialIcon name="save" /> Guardar Prompt
              </button>
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary-container))' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <MaterialIcon name="psychology" style={{ color: 'white', fontSize: 28 }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>Estado del Modelo IA</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Nexus Intelligence v2.1</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Precisión del Modelo', value: '94.2%' },
                  { label: 'Mensajes Procesados Hoy', value: '1,284' },
                  { label: 'Conversaciones Activas', value: '42' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{m.label}</span>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orders View ───────────────────────────────────────────────────────────
function OrdersView({
  orders,
  onStartPreparing,
  onMarkReady,
  onDeliver,
  tick,
}: {
  orders: Order[];
  onStartPreparing: (id: string) => void;
  onMarkReady: (id: string) => void;
  onDeliver: (id: string) => void;
  tick: number;
}) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const getMinutes = (d: Date) => Math.floor((Date.now() - d.getTime()) / 60000);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Gestión de Pedidos</h2>
          <p>
            <MaterialIcon name="chat" />
            {orders.length} pedidos activos · Generados por WhatsApp IA
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className={`btn ${view === 'kanban' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('kanban')}
          >
            <MaterialIcon name="view_kanban" /> KDS
          </button>
          <button
            className={`btn ${view === 'table' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('table')}
          >
            <MaterialIcon name="table_rows" /> Tabla
          </button>
          <button className="btn btn-outline">
            <MaterialIcon name="download" /> CSV
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        /* KDS Kanban Board */
        <div className="kds-board">
          {/* Column: NEW */}
          <div className="kds-column">
            <div className="kds-column-header">
              <h3>Nuevos</h3>
              <span className="kds-column-count" style={{ background: '#1a146b' }}>
                {orders.filter(o => o.status === 'NEW').length}
              </span>
            </div>
            <div className="kds-cards">
              {orders.filter(o => o.status === 'NEW').map(order => {
                const elapsed = getMinutes(order.createdAt);
                return (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <div className="order-id">#{order.id}</div>
                        <div className="order-customer">{order.customerName}</div>
                      </div>
                      <span className={`order-timer timer-normal`}>
                        <MaterialIcon name="schedule" /> {elapsed} min
                      </span>
                    </div>
                    <div className="order-products">
                      <div className="order-products-label">Productos</div>
                      {order.items.map((it, i) => (
                        <div key={i} className="order-product-item">{it.quantity}× {it.name}</div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>${order.total.toFixed(2)}</span>
                      <span className="badge badge-new" style={{ fontSize: 11 }}>{order.paymentMethod}</span>
                    </div>
                    <button className="btn btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={() => onStartPreparing(order.id)}>
                      <MaterialIcon name="restaurant" /> INICIAR PREPARACIÓN
                    </button>
                  </div>
                );
              })}
              {orders.filter(o => o.status === 'NEW').length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-outline)' }}>
                  <MaterialIcon name="check_circle" style={{ fontSize: 32, color: 'var(--color-success-emerald)', display: 'block', marginBottom: 8, textAlign: 'center' }} />
                  <div style={{ fontSize: 13 }}>Sin pedidos nuevos</div>
                </div>
              )}
            </div>
          </div>

          {/* Column: PREPARING */}
          <div className="kds-column">
            <div className="kds-column-header">
              <h3>En Preparación</h3>
              <span className="kds-column-count" style={{ background: '#312e81' }}>
                {orders.filter(o => o.status === 'PREPARING').length}
              </span>
            </div>
            <div className="kds-cards">
              {orders.filter(o => o.status === 'PREPARING').map(order => {
                const elapsed = getMinutes(order.createdAt);
                const isRed = elapsed >= 25;
                const isYellow = elapsed >= 15 && elapsed < 25;
                return (
                  <div key={order.id} className={`order-card${isRed ? ' alert-critical' : isYellow ? ' alert-warning' : ''}`}>
                    {isRed && (
                      <div className="alert-banner">
                        <MaterialIcon name="warning" /> DEMORA CRÍTICA (+25 min)
                      </div>
                    )}
                    <div className="order-header">
                      <div>
                        <div className="order-id">#{order.id}</div>
                        <div className="order-customer">{order.customerName}</div>
                      </div>
                      <span className={`order-timer ${isRed ? 'timer-critical' : isYellow ? 'timer-warning' : 'timer-normal'}`}>
                        <MaterialIcon name="schedule" /> {elapsed} min
                      </span>
                    </div>
                    <div className="order-products">
                      <div className="order-products-label">Productos</div>
                      {order.items.map((it, i) => (
                        <div key={i} className="order-product-item">{it.quantity}× {it.name}</div>
                      ))}
                    </div>
                    {order.notes && (
                      <div className="order-note">
                        <strong>🤖 NOTA IA: </strong>{order.notes}
                      </div>
                    )}
                    <button className="btn btn-success" style={{ width: '100%', padding: '10px' }} onClick={() => onMarkReady(order.id)}>
                      <MaterialIcon name="done_all" /> MARCAR COMO LISTO
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column: READY */}
          <div className="kds-column">
            <div className="kds-column-header">
              <h3>Listos / Despacho</h3>
              <span className="kds-column-count" style={{ background: 'var(--color-whatsapp-green)' }}>
                {orders.filter(o => o.status === 'READY').length}
              </span>
            </div>
            <div className="kds-cards">
              {orders.filter(o => o.status === 'READY').map(order => (
                <div key={order.id} className="order-card" style={{ opacity: 0.85 }}>
                  <div className="order-header">
                    <div>
                      <div className="order-id">#{order.id}</div>
                      <div className="order-customer">{order.customerName}</div>
                    </div>
                    <span className="badge badge-active">Listo ✓</span>
                  </div>
                  <div className="order-products">
                    <div className="order-products-label">Productos</div>
                    {order.items.map((it, i) => (
                      <div key={i} className="order-product-item" style={{ textDecoration: 'line-through', color: 'var(--color-outline)' }}>
                        {it.quantity}× {it.name}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-primary)' }}>${order.total.toFixed(2)}</span>
                    <span className="badge badge-delivered">{order.paymentMethod}</span>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={() => onDeliver(order.id)}>
                    <MaterialIcon name="local_shipping" /> MARCAR ENTREGADO
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Table View */
        <div>
          <div className="filter-bar">
            <div className="filter-select-wrap">
              <MaterialIcon name="filter_list" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-outline)' }} />
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="ALL">Todos los estados</option>
                <option value="NEW">Nuevos</option>
                <option value="PREPARING">Preparando</option>
                <option value="READY">Listos</option>
              </select>
            </div>
            <div className="filter-select-wrap">
              <MaterialIcon name="payments" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-outline)' }} />
              <select className="filter-select">
                <option>Todos los pagos</option>
                <option>WhatsApp Pay</option>
                <option>Efectivo</option>
                <option>QR</option>
              </select>
            </div>
            <div className="auto-sync-badge">
              <MaterialIcon name="sync" /> Auto-sync activo
            </div>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Pedido</th><th>Cliente</th><th>Productos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Pago</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter(o => filterStatus === 'ALL' || o.status === filterStatus).map(o => (
                  <tr key={o.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>#{o.id}</span>
                      <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 2 }}>
                        {o.createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="customer-avatar" style={{ background: '#e2dfff', color: 'var(--color-primary)' }}>
                          {o.customerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{o.customerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-outline)' }}>{o.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>
                      {o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>${o.total.toFixed(2)}</td>
                    <td><span className="badge badge-new">{o.paymentMethod}</span></td>
                    <td>
                      <span className={`badge ${
                        o.status === 'NEW' ? 'badge-new' :
                        o.status === 'PREPARING' ? 'badge-preparing' :
                        o.status === 'READY' ? 'badge-ready' : 'badge-delivered'
                      }`}>
                        {o.status === 'NEW' ? 'Nuevo' : o.status === 'PREPARING' ? 'Preparando' : o.status === 'READY' ? 'Listo' : 'Entregado'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {o.status === 'NEW' && (
                          <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => onStartPreparing(o.id)}>
                            Preparar
                          </button>
                        )}
                        {o.status === 'PREPARING' && (
                          <button className="btn btn-success" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => onMarkReady(o.id)}>
                            Listo
                          </button>
                        )}
                        {o.status === 'READY' && (
                          <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => onDeliver(o.id)}>
                            Entregar
                          </button>
                        )}
                        <button className="btn btn-ghost" style={{ padding: '5px 8px' }}>
                          <MaterialIcon name="more_vert" style={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customers View ────────────────────────────────────────────────────────
function CustomersView() {
  const [customers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Clientes</h2>
          <p>
            <MaterialIcon name="group" />
            {customers.length} clientes registrados · Captados por WhatsApp IA
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline">
            <MaterialIcon name="download" /> Exportar
          </button>
          <button className="btn btn-primary">
            <MaterialIcon name="person_add" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon indigo"><MaterialIcon name="group" filled /></div>
          <div>
            <div className="stat-label">Total Clientes</div>
            <div className="stat-value">{customers.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MaterialIcon name="verified_user" filled /></div>
          <div>
            <div className="stat-label">Activos</div>
            <div className="stat-value">{customers.filter(c => c.status === 'ACTIVE').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MaterialIcon name="shopping_bag" filled /></div>
          <div>
            <div className="stat-label">Pedidos Totales</div>
            <div className="stat-value">{customers.reduce((s, c) => s + c.totalOrders, 0)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><MaterialIcon name="attach_money" filled /></div>
          <div>
            <div className="stat-label">Facturación Total</div>
            <div className="stat-value">${customers.reduce((s, c) => s + c.totalSpend, 0).toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div className="topbar-search" style={{ width: 'auto', flex: 1, maxWidth: 360 }}>
          <MaterialIcon name="search" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
          />
        </div>
        <div className="filter-select-wrap">
          <MaterialIcon name="filter_list" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--color-outline)' }} />
          <select className="filter-select" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <option>Todos</option><option>Activos</option><option>Inactivos</option>
          </select>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cliente</th><th>Teléfono</th><th style={{ textAlign: 'center' }}>Pedidos</th>
              <th style={{ textAlign: 'right' }}>Gasto Total</th>
              <th>Desde</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="customer-avatar" style={{ background: c.avatarColor, color: 'var(--color-primary)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {c.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.email && <div style={{ fontSize: 11, color: 'var(--color-outline)' }}>{c.email}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.phone}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.totalOrders}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>${c.totalSpend.toFixed(2)}</td>
                <td style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{c.joinDate}</td>
                <td><span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>{c.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
                      <MaterialIcon name="chat" style={{ fontSize: 15 }} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
                      <MaterialIcon name="edit" style={{ fontSize: 15 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Settings View ─────────────────────────────────────────────────────────
function SettingsView() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('business-profile');
  const [waCfg, setWaCfg] = useState({
    phoneId: '109283746501928',
    verifyToken: 'flowcommerce_wh_token_2026',
    accessToken: 'EAAGb37...z9P2kd8s',
    webhookUrl: 'https://api.flowcommerce.io/webhooks/whatsapp',
  });

  const settingsTabs: { key: SettingsTab; label: string; icon: string }[] = [
    { key: 'business-profile', label: 'Perfil del Negocio', icon: 'storefront' },
    { key: 'team-management', label: 'Gestión de Equipo', icon: 'groups' },
    { key: 'whatsapp-integration', label: 'WhatsApp & IA', icon: 'chat' },
    { key: 'billing-security', label: 'Facturación & Seguridad', icon: 'security' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Configuración</h2>
          <p>
            <MaterialIcon name="settings" />
            Administra tu cuenta, integraciones y preferencias del sistema
          </p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Settings Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-card">
            {settingsTabs.map(t => (
              <button
                key={t.key}
                className={`settings-nav-item${settingsTab === t.key ? ' active' : ''}`}
                onClick={() => setSettingsTab(t.key)}
              >
                <MaterialIcon name={t.icon} filled={settingsTab === t.key} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Business Profile */}
          {settingsTab === 'business-profile' && (
            <div className="card">
              <div className="nexus-indicator" />
              <div className="card-body">
                <div className="section-title"><MaterialIcon name="storefront" /> Perfil del Negocio</div>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 24 }}>
                  Administra los datos de tu empresa y preferencias globales de la plataforma.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Nombre del Negocio', value: 'Pizzería Nexus', type: 'text' },
                    { label: 'Industria', value: 'Restaurante & Delivery', type: 'text' },
                    { label: 'País / Región', value: 'Colombia', type: 'text' },
                    { label: 'Zona Horaria', value: 'America/Bogota (UTC-5)', type: 'text' },
                    { label: 'Email de Contacto', value: 'hola@pizzerianexus.com', type: 'email' },
                    { label: 'Teléfono Principal', value: '+57 300 123 4567', type: 'tel' },
                  ].map(f => (
                    <div key={f.label} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{f.label}</label>
                      <input className="form-input" type={f.type} defaultValue={f.value} />
                    </div>
                  ))}
                </div>
                <div className="form-group" style={{ marginTop: 20 }}>
                  <label className="form-label">Descripción del Negocio</label>
                  <textarea className="form-input" rows={3} defaultValue="Pizzería artesanal con delivery propio. Especialistas en pizzas de masa madre y hamburguesas gourmet. Pedidos por WhatsApp." />
                </div>
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn btn-outline">Cancelar</button>
                  <button className="btn btn-primary"><MaterialIcon name="save" /> Guardar Cambios</button>
                </div>
              </div>
            </div>
          )}

          {/* Team Management */}
          {settingsTab === 'team-management' && (
            <div className="card">
              <div className="nexus-indicator" />
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}><MaterialIcon name="groups" /> Gestión de Equipo</div>
                  <button className="btn btn-primary"><MaterialIcon name="person_add" /> Invitar Miembro</button>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 24 }}>
                  Administra los accesos y roles de tu equipo de trabajo.
                </p>
                <div className="data-table-wrapper" style={{ boxShadow: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Miembro</th><th>Rol</th><th>Último Acceso</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Admin Principal', email: 'admin@nexus.com', role: 'Super Admin', last: 'Hoy', status: 'ACTIVE', initials: 'AP' },
                        { name: 'María García', email: 'mgarcia@nexus.com', role: 'Operador KDS', last: 'Hace 2h', status: 'ACTIVE', initials: 'MG' },
                        { name: 'Juan López', email: 'jlopez@nexus.com', role: 'Agente IA', last: 'Ayer', status: 'INACTIVE', initials: 'JL' },
                      ].map(m => (
                        <tr key={m.email}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="customer-avatar" style={{ background: 'var(--color-primary-fixed)', color: 'var(--color-primary)', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{m.initials}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-outline)' }}>{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge badge-delivered">{m.role}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{m.last}</td>
                          <td><span className={`badge ${m.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>{m.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                              <MaterialIcon name="edit" style={{ fontSize: 15 }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp & AI */}
          {settingsTab === 'whatsapp-integration' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="nexus-indicator" />
                <div className="card-body">
                  <div className="section-title"><MaterialIcon name="chat" /> Configuración de WhatsApp Business API</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div className="status-indicator status-connected">
                      <div className="status-indicator-dot" />
                      Webhook Conectado
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Última verificación: hace 2 min</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">WhatsApp Phone ID</label>
                      <input className="form-input" value={waCfg.phoneId} onChange={e => setWaCfg({ ...waCfg, phoneId: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Webhook Verify Token</label>
                      <input className="form-input" value={waCfg.verifyToken} onChange={e => setWaCfg({ ...waCfg, verifyToken: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                      <label className="form-label">Meta Access Token</label>
                      <input className="form-input font-mono" type="password" value={waCfg.accessToken} onChange={e => setWaCfg({ ...waCfg, accessToken: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                      <label className="form-label">Webhook URL (para Meta)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="form-input font-mono" readOnly value={waCfg.webhookUrl} style={{ flex: 1 }} />
                        <button className="btn btn-outline">
                          <MaterialIcon name="content_copy" style={{ fontSize: 16 }} />
                        </button>
                      </div>
                      <div className="form-hint">Copia esta URL y pégala en tu configuración de Meta for Developers.</div>
                    </div>
                  </div>
                  <div className="divider" />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-outline"><MaterialIcon name="refresh" /> Probar Conexión</button>
                    <button className="btn btn-primary"><MaterialIcon name="save" /> Guardar</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="nexus-indicator" />
                <div className="card-body">
                  <div className="section-title"><MaterialIcon name="smart_toy" /> Configuración del Agente IA</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Proveedor de IA</label>
                      <select className="form-input">
                        <option>Google Gemini (Recomendado)</option>
                        <option>OpenAI GPT-4o</option>
                        <option>Anthropic Claude 3</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Temperatura del Modelo</label>
                      <input className="form-input" type="number" defaultValue={0.7} min={0} max={1} step={0.1} />
                      <div className="form-hint">0 = Determinístico · 1 = Creativo</div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tiempo máx. de respuesta</label>
                      <input className="form-input" type="text" defaultValue="30 segundos" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Idioma predeterminado</label>
                      <select className="form-input">
                        <option>Español (Colombia)</option>
                        <option>English (US)</option>
                        <option>Português (BR)</option>
                      </select>
                    </div>
                  </div>
                  <div className="divider" />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary"><MaterialIcon name="save" /> Guardar Configuración</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing & Security */}
          {settingsTab === 'billing-security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Current Plan */}
              <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary-container) 100%)' }}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan Actual</div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 800, marginTop: 4 }}>Professional</div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 }}>$49.00 USD / mes · Renueva Jun 30, 2026</div>
                    </div>
                    <button className="btn" style={{ background: 'white', color: 'var(--color-primary)', fontWeight: 700 }}>
                      <MaterialIcon name="upgrade" /> Actualizar
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
                    {[
                      { label: 'Mensajes / mes', used: '12,450', total: '25,000' },
                      { label: 'Productos IA', used: '5', total: '10' },
                      { label: 'Agentes activos', used: '2', total: '5' },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ color: 'white', fontWeight: 700 }}>{m.used} <span style={{ opacity: 0.6, fontWeight: 400 }}>/ {m.total}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="nexus-indicator" />
                <div className="card-body">
                  <div className="section-title"><MaterialIcon name="credit_card" /> Método de Pago</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--color-surface-soft)', borderRadius: 10, border: '1px solid var(--color-border-subtle)' }}>
                    <MaterialIcon name="credit_card" style={{ fontSize: 28, color: 'var(--color-primary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>•••• •••• •••• 4242</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Visa · Vence 12/2028</div>
                    </div>
                    <span className="badge badge-active">Principal</span>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px' }}><MaterialIcon name="edit" style={{ fontSize: 16 }} /></button>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-outline"><MaterialIcon name="add" /> Agregar Método de Pago</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="nexus-indicator" />
                <div className="card-body">
                  <div className="section-title"><MaterialIcon name="lock" /> Seguridad de la Cuenta</div>
                  <div className="space-y">
                    {[
                      { label: 'Cambiar Contraseña', desc: 'Última vez hace 30 días', icon: 'key' },
                      { label: 'Autenticación de Dos Factores (2FA)', desc: 'No configurado · Recomendado', icon: 'phonelink_lock' },
                      { label: 'Sesiones Activas', desc: '2 dispositivos conectados', icon: 'devices' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcon name={s.icon} style={{ color: 'var(--color-primary)', fontSize: 20 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>{s.desc}</div>
                        </div>
                        <button className="btn btn-outline" style={{ fontSize: 12 }}>Configurar</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [tick, setTick] = useState(0);

  const [orders, setOrders] = useState<Order[]>([
    { id: '1042', customerName: 'Isaac Mendoza', phone: '573001234567', paymentMethod: 'WhatsApp Pay',
      items: [{ name: 'Pizza Familiar Pepperoni', quantity: 1, price: 14.99 }, { name: 'Gaseosa Coca-Cola 2L', quantity: 1, price: 3.50 }],
      total: 18.49, createdAt: new Date(Date.now() - 28 * 60 * 1000), status: 'PREPARING',
      notes: 'Sin cebolla. Alérgeno: Lácteos.' },
    { id: '1043', customerName: 'Laura Gómez', phone: '573129876543', paymentMethod: 'Efectivo',
      items: [{ name: 'Hamburguesa Nexus doble queso', quantity: 2, price: 9.50 }, { name: 'Papas fritas grandes', quantity: 1, price: 4.00 }],
      total: 23.00, createdAt: new Date(Date.now() - 17 * 60 * 1000), status: 'PREPARING' },
    { id: '1044', customerName: 'Carlos Ruiz', phone: '573155554433', paymentMethod: 'QR',
      items: [{ name: 'Alitas BBQ x12', quantity: 1, price: 11.00 }],
      total: 11.00, createdAt: new Date(Date.now() - 3 * 60 * 1000), status: 'NEW' },
    { id: '1041', customerName: 'Sofía Silva', phone: '573009998877', paymentMethod: 'WhatsApp Pay',
      items: [{ name: 'Pizza Margherita', quantity: 1, price: 12.50 }],
      total: 12.50, createdAt: new Date(Date.now() - 38 * 60 * 1000), status: 'READY' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const sim = setInterval(() => {
      const names = ['Patricia Rojas', 'Roberto Díaz', 'Ana Martínez', 'Felipe Torres'];
      const products = ['Pizza Hawaiana', 'Combo Familiar', 'Alitas x6', 'Hamburgesa Clásica'];
      const methods = ['WhatsApp Pay', 'Efectivo', 'QR'];
      const name = names[Math.floor(Math.random() * names.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const price = parseFloat((8 + Math.random() * 20).toFixed(2));
      const newOrder: Order = {
        id: Math.floor(1050 + Math.random() * 900).toString(),
        customerName: name, phone: '57300' + Math.floor(1000000 + Math.random() * 9000000),
        paymentMethod: methods[Math.floor(Math.random() * methods.length)],
        items: [{ name: product, quantity: 1, price }],
        total: price, createdAt: new Date(), status: 'NEW',
      };
      setOrders(prev => [...prev, newOrder]);

      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      } catch {}
    }, 45000);
    return () => clearInterval(sim);
  }, []);

  const handleStartPreparing = (id: string) =>
    setOrders(p => p.map(o => o.id === id ? { ...o, status: 'PREPARING', createdAt: new Date() } : o));

  const handleMarkReady = (id: string) =>
    setOrders(p => p.map(o => o.id === id ? { ...o, status: 'READY' } : o));

  const handleDeliver = (id: string) =>
    setOrders(p => p.filter(o => o.id !== id));

  const newOrdersCount = orders.filter(o => o.status === 'NEW').length;

  const tabTitles: Record<TabKey, string> = {
    'dashboard': 'Dashboard',
    'ai-knowledge': 'AI Knowledge Base',
    'orders': 'Gestión de Pedidos',
    'customers': 'Clientes',
    'settings': 'Configuración',
  };

  return (
    <>
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, position: 'relative', zIndex: 1 }}>hexagon</span>
          </div>
          <div className="sidebar-logo-text">
            <h1>Nexus AI</h1>
            <p>Sales Automation</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <NavItem icon="dashboard" label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon="psychology" label="AI Knowledge Base" active={activeTab === 'ai-knowledge'} onClick={() => setActiveTab('ai-knowledge')} />
          <NavItem icon="shopping_cart" label="Pedidos" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} badge={newOrdersCount} />
          <NavItem icon="group" label="Clientes" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          <NavItem icon="settings" label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        <div className="sidebar-bottom">
          <button className="btn-upgrade">
            <MaterialIcon name="auto_awesome" />
            Upgrade to Pro
          </button>
          <button className="nav-item-small">
            <MaterialIcon name="help" style={{ fontSize: 18 }} /> Help Center
          </button>
          <button className="nav-item-small">
            <MaterialIcon name="logout" style={{ fontSize: 18 }} /> Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-search">
              <MaterialIcon name="search" />
              <input placeholder={`Buscar en ${tabTitles[activeTab]}...`} />
            </div>
          </div>
          <div className="topbar-right">
            <div className="status-indicator status-connected" style={{ padding: '4px 12px', fontSize: 11 }}>
              <div className="status-indicator-dot" />
              WhatsApp: Activo
            </div>
            <button className="topbar-icon-btn">
              <MaterialIcon name="notifications" />
              <span className="notification-dot" />
            </button>
            <button className="topbar-icon-btn">
              <MaterialIcon name="bolt" />
              <span className="notification-dot active-dot" />
            </button>
            <div className="topbar-avatar">
              GC
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-canvas">
          {activeTab === 'dashboard' && <DashboardView orders={orders} />}
          {activeTab === 'ai-knowledge' && <AIKnowledgeView />}
          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              onStartPreparing={handleStartPreparing}
              onMarkReady={handleMarkReady}
              onDeliver={handleDeliver}
              tick={tick}
            />
          )}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </div>
    </>
  );
}
