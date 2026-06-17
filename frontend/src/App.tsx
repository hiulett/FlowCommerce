import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'ai-knowledge' | 'orders' | 'customers' | 'settings';
type SettingsTab = 'business-profile' | 'team-management' | 'whatsapp-integration' | 'billing-security';
type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'DELIVERED';
type CustomerStatus = 'ACTIVE' | 'INACTIVE';
type ModalKey =
  | 'invite-member' | 'edit-member' | 'delete-member'
  | 'new-customer' | 'edit-customer' | 'delete-customer' | 'view-customer'
  | 'upload-document' | 'edit-document' | 'delete-document'
  | 'test-whatsapp'
  | 'change-password' | 'setup-2fa' | 'active-sessions'
  | null;

interface ToastMsg { id: number; message: string; type: 'success' | 'error' | 'info'; }
interface OrderItem { name: string; quantity: number; price: number; }
interface Order {
  id: string; customerName: string; phone: string;
  items: OrderItem[]; total: number; createdAt: Date;
  status: OrderStatus; notes?: string; paymentMethod: string;
}
interface Customer {
  id: string; name: string; phone: string; email?: string;
  totalOrders: number; totalSpend: number; status: CustomerStatus;
  joinDate: string; initials: string; avatarColor: string;
}
interface TeamMember {
  id: string; name: string; email: string;
  role: 'Super Admin' | 'Operador KDS' | 'Agente IA' | 'Solo Lectura';
  lastAccess: string; status: 'ACTIVE' | 'INACTIVE'; initials: string;
}
interface KBDocument {
  id: string; title: string;
  type: 'FAQ' | 'CATALOG' | 'POLICY' | 'PROMO';
  wordCount: number; lastUpdated: string;
  status: 'TRAINED' | 'PENDING'; content?: string;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_CUSTOMERS: Customer[] = [
  { id: 'C001', name: 'Isaac Mendoza', phone: '+57 300 123 4567', email: 'i.mendoza@email.com', totalOrders: 14, totalSpend: 287.40, status: 'ACTIVE', joinDate: '2026-03-12', initials: 'IM', avatarColor: '#e2dfff' },
  { id: 'C002', name: 'Laura Gómez', phone: '+57 312 987 6543', email: 'lgomez@email.com', totalOrders: 8, totalSpend: 144.00, status: 'ACTIVE', joinDate: '2026-04-05', initials: 'LG', avatarColor: '#d1fae5' },
  { id: 'C003', name: 'Carlos Ruiz', phone: '+57 315 555 4433', totalOrders: 3, totalSpend: 52.50, status: 'INACTIVE', joinDate: '2026-05-20', initials: 'CR', avatarColor: '#dbeafe' },
  { id: 'C004', name: 'Sofía Silva', phone: '+57 300 999 8877', email: 'ssilva@biz.com', totalOrders: 22, totalSpend: 498.75, status: 'ACTIVE', joinDate: '2026-02-01', initials: 'SS', avatarColor: '#fde68a' },
  { id: 'C005', name: 'Andrés Medina', phone: '+57 301 234 5678', totalOrders: 5, totalSpend: 89.00, status: 'ACTIVE', joinDate: '2026-04-18', initials: 'AM', avatarColor: '#ffdbc7' },
];
const INIT_TEAM: TeamMember[] = [
  { id: 'T001', name: 'Admin Principal', email: 'admin@nexus.com', role: 'Super Admin', lastAccess: 'Hoy, 19:30', status: 'ACTIVE', initials: 'AP' },
  { id: 'T002', name: 'María García', email: 'mgarcia@nexus.com', role: 'Operador KDS', lastAccess: 'Hace 2h', status: 'ACTIVE', initials: 'MG' },
  { id: 'T003', name: 'Juan López', email: 'jlopez@nexus.com', role: 'Agente IA', lastAccess: 'Ayer', status: 'INACTIVE', initials: 'JL' },
];
const INIT_KB: KBDocument[] = [
  { id: 'KB001', title: 'Menú Principal y Precios 2026', type: 'CATALOG', wordCount: 1240, lastUpdated: '2026-06-15', status: 'TRAINED', content: 'Pizza Margherita...$12.50\nPizza Pepperoni Familiar...$14.99\nHamburguesa Doble Queso...$9.50' },
  { id: 'KB002', title: 'Preguntas Frecuentes - Delivery', type: 'FAQ', wordCount: 680, lastUpdated: '2026-06-10', status: 'TRAINED', content: '¿Cuánto tarda el delivery?\nGeneralmente entre 30-45 minutos dependiendo de tu zona.' },
  { id: 'KB003', title: 'Política de Devoluciones', type: 'POLICY', wordCount: 320, lastUpdated: '2026-05-28', status: 'TRAINED', content: 'Aceptamos devoluciones dentro de las primeras 2 horas de recibido el pedido.' },
  { id: 'KB004', title: 'Promociones Junio 2026', type: 'PROMO', wordCount: 410, lastUpdated: '2026-06-16', status: 'PENDING', content: '2x1 en pizzas los martes. 20% descuento en tu primer pedido.' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────
function MI({ name, filled = false, style }: { name: string; filled?: boolean; style?: React.CSSProperties }) {
  return <span className={`material-symbols-outlined${filled ? ' filled' : ''}`} style={style}>{name}</span>;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#e2dfff', '#d1fae5', '#dbeafe', '#fde68a', '#ffdbc7', '#fce7f3', '#ede9fe'];
const ROLE_CLASS: Record<TeamMember['role'], string> = {
  'Super Admin': 'role-superadmin', 'Operador KDS': 'role-operator',
  'Agente IA': 'role-agent', 'Solo Lectura': 'role-operator',
};
const KB_ICONS: Record<KBDocument['type'], string> = { FAQ: 'quiz', CATALOG: 'menu_book', POLICY: 'policy', PROMO: 'sell' };
const KB_TYPE_LABEL: Record<KBDocument['type'], string> = { FAQ: 'Preguntas Frecuentes', CATALOG: 'Catálogo', POLICY: 'Política', PROMO: 'Promoción' };

// ─── Base Modal ───────────────────────────────────────────────────────────────
function Modal({ children, onClose, size = '' }: { children: React.ReactNode; onClose: () => void; size?: string; }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-panel ${size}`}>{children}</div>
    </div>
  );
}

function ModalHeader({ icon, iconColor = 'indigo', title, subtitle, onClose }: {
  icon: string; iconColor?: string; title: string; subtitle?: string; onClose: () => void;
}) {
  return (
    <div className="modal-header">
      <div className="modal-header-left">
        <div className={`modal-icon ${iconColor}`}><MI name={icon} filled /></div>
        <div><div className="modal-title">{title}</div>{subtitle && <div className="modal-subtitle">{subtitle}</div>}</div>
      </div>
      <button className="modal-close" onClick={onClose}><MI name="close" /></button>
    </div>
  );
}

// ─── Toast System ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: number) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
          <MI name={t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'} />
          <span style={{ flex: 1 }}>{t.message}</span>
          <MI name="close" style={{ fontSize: 16, opacity: 0.7 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);
  const cls = score <= 1 ? 'strength-weak' : score <= 2 ? 'strength-medium' : 'strength-strong';
  const label = score <= 1 ? 'Débil' : score <= 2 ? 'Media' : 'Fuerte';
  const color = score <= 1 ? 'var(--color-error)' : score <= 2 ? '#f59e0b' : 'var(--color-success-emerald)';
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div className={`password-strength-bar ${cls}`} />
      <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 4 }}>Seguridad: {label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Invite / Edit Member ────────────────────────────────────────────────────
function MemberModal({ member, onClose, onSave }: {
  member?: TeamMember; onClose: () => void;
  onSave: (m: Omit<TeamMember, 'id' | 'initials' | 'lastAccess'>) => void;
}) {
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [role, setRole] = useState<TeamMember['role']>(member?.role ?? 'Operador KDS');
  const [status, setStatus] = useState<TeamMember['status']>(member?.status ?? 'ACTIVE');
  const isEdit = !!member;

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={isEdit ? 'manage_accounts' : 'person_add'} iconColor="indigo"
        title={isEdit ? 'Editar Miembro' : 'Invitar Miembro al Equipo'}
        subtitle={isEdit ? `Editando: ${member.email}` : 'Se enviará un email de invitación'}
        onClose={onClose}
      />
      <div className="modal-body">
        {!isEdit && (
          <div className="inline-alert alert-info" style={{ marginBottom: 20 }}>
            <MI name="info" />
            <span>El nuevo miembro recibirá un email con instrucciones para activar su cuenta.</span>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre Completo</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: María García" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Rol y Permisos</label>
          <select className="form-input" value={role} onChange={e => setRole(e.target.value as TeamMember['role'])}>
            <option value="Super Admin">Super Admin — Acceso total</option>
            <option value="Operador KDS">Operador KDS — Gestión de pedidos</option>
            <option value="Agente IA">Agente IA — Configuración del agente</option>
            <option value="Solo Lectura">Solo Lectura — Sin modificaciones</option>
          </select>
        </div>
        {isEdit && (
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>
        )}
        <div className="inline-alert alert-warning" style={{ marginTop: 8 }}>
          <MI name="shield" />
          <span>Los permisos de <strong>Super Admin</strong> permiten eliminar datos y gestionar facturación.</span>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { if (name && email) { onSave({ name, email, role, status }); onClose(); } }}>
          <MI name={isEdit ? 'save' : 'send'} /> {isEdit ? 'Guardar Cambios' : 'Enviar Invitación'}
        </button>
      </div>
    </Modal>
  );
}

// ── 2. New / Edit Customer ────────────────────────────────────────────────────
function CustomerModal({ customer, onClose, onSave }: {
  customer?: Customer; onClose: () => void;
  onSave: (c: Partial<Customer>) => void;
}) {
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? 'ACTIVE');
  const isEdit = !!customer;

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={isEdit ? 'person_edit' : 'person_add'} iconColor="blue"
        title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        subtitle={isEdit ? customer.phone : 'Registrar cliente manualmente'}
        onClose={onClose}
      />
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Nombre Completo *</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del cliente" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Teléfono WhatsApp *</label>
            <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 300 000 0000" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email (opcional)</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@cliente.com" />
          </div>
        </div>
        {isEdit && (
          <div className="form-group" style={{ marginTop: 20 }}>
            <label className="form-label">Estado</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['ACTIVE', 'INACTIVE'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className="btn" style={{
                    flex: 1, padding: '10px',
                    background: status === s ? (s === 'ACTIVE' ? '#d1fae5' : '#fee2e2') : 'transparent',
                    border: `2px solid ${status === s ? (s === 'ACTIVE' ? '#065f46' : 'var(--color-error)') : 'var(--color-border-subtle)'}`,
                    color: status === s ? (s === 'ACTIVE' ? '#065f46' : 'var(--color-error)') : 'var(--color-on-surface-variant)',
                  }}>
                  <MI name={s === 'ACTIVE' ? 'check_circle' : 'cancel'} />
                  {s === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </button>
              ))}
            </div>
          </div>
        )}
        {isEdit && (
          <div style={{ marginTop: 20, padding: '14px', background: 'var(--color-surface-soft)', borderRadius: 10, border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estadísticas</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pedidos', value: customer.totalOrders },
                { label: 'Gasto Total', value: `$${customer.totalSpend.toFixed(2)}` },
                { label: 'Cliente desde', value: customer.joinDate },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{s.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { if (name && phone) { onSave({ name, phone, email, status }); onClose(); } }}>
          <MI name="save" /> {isEdit ? 'Guardar Cambios' : 'Crear Cliente'}
        </button>
      </div>
    </Modal>
  );
}

// ── 3. Delete Confirmation ─────────────────────────────────────────────────────
function DeleteModal({ title, description, onClose, onConfirm }: {
  title: string; description: string; onClose: () => void; onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  return (
    <Modal onClose={onClose} size="modal-sm">
      <ModalHeader icon="delete_forever" iconColor="red" title="Confirmar Eliminación" onClose={onClose} />
      <div className="modal-body" style={{ textAlign: 'center' }}>
        <div className="modal-confirm-icon danger"><MI name="warning" filled /></div>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 20 }}>{description}</p>
        <div className="inline-alert alert-error" style={{ textAlign: 'left', marginBottom: 16 }}>
          <MI name="info" />
          <span>Esta acción es <strong>irreversible</strong> y no puede deshacerse.</span>
        </div>
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label className="form-label">Escribe <strong>ELIMINAR</strong> para confirmar</label>
          <input className="form-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder="ELIMINAR" />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" disabled={typed !== 'ELIMINAR'}
          onClick={() => { onConfirm(); onClose(); }}
          style={{ opacity: typed !== 'ELIMINAR' ? 0.4 : 1 }}>
          <MI name="delete" /> Eliminar Definitivamente
        </button>
      </div>
    </Modal>
  );
}

// ── 4. Upload / Edit Document ──────────────────────────────────────────────────
function DocumentModal({ document, onClose, onSave }: {
  document?: KBDocument; onClose: () => void;
  onSave: (d: Partial<KBDocument>) => void;
}) {
  const [title, setTitle] = useState(document?.title ?? '');
  const [type, setType] = useState<KBDocument['type']>(document?.type ?? 'FAQ');
  const [content, setContent] = useState(document?.content ?? '');
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<'text' | 'file'>('text');
  const isEdit = !!document;

  return (
    <Modal onClose={onClose} size="modal-lg">
      <ModalHeader
        icon={isEdit ? 'edit_document' : 'upload_file'} iconColor="indigo"
        title={isEdit ? 'Editar Documento' : 'Cargar Documento de Conocimiento'}
        subtitle="El agente IA aprenderá del contenido de este documento"
        onClose={onClose}
      />
      <div className="modal-body">
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Título del Documento *</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Menú Principal 2026" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo de Contenido</label>
            <select className="form-input" value={type} onChange={e => setType(e.target.value as KBDocument['type'])}>
              <option value="CATALOG">📋 Catálogo de Productos</option>
              <option value="FAQ">❓ Preguntas Frecuentes</option>
              <option value="POLICY">📜 Política / Términos</option>
              <option value="PROMO">🎯 Promociones</option>
            </select>
          </div>
        </div>

        {!isEdit && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--color-surface-container)', borderRadius: 10, padding: 4 }}>
            {(['text', 'file'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="btn" style={{
                  flex: 1, padding: '8px',
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  borderRadius: 8, border: 'none', fontWeight: tab === t ? 700 : 400,
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}>
                <MI name={t === 'text' ? 'edit' : 'attach_file'} style={{ fontSize: 16 }} />
                {t === 'text' ? 'Escribir / Pegar' : 'Subir Archivo'}
              </button>
            ))}
          </div>
        )}

        {(isEdit || tab === 'text') ? (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contenido del Documento</label>
            <textarea
              className="form-input"
              rows={10}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Pega aquí el contenido de tu menú, FAQ, política o promociones..."
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div className="form-hint">
              {content.split(' ').filter(Boolean).length} palabras · El modelo IA procesará este texto automáticamente.
            </div>
          </div>
        ) : (
          <div
            className={`drop-zone${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); }}
          >
            <MI name="cloud_upload" style={{ fontSize: 48, color: 'var(--color-secondary-container)', display: 'block', textAlign: 'center', marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-on-surface)', marginBottom: 6 }}>
              Arrastra tu archivo aquí
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
              Compatible con .pdf, .docx, .txt, .csv
            </div>
            <button className="btn btn-outline" onClick={() => {}}>
              <MI name="folder_open" /> Buscar Archivo
            </button>
          </div>
        )}

        <div className="inline-alert alert-info" style={{ marginTop: 16 }}>
          <MI name="psychology" />
          <span>El entrenamiento del modelo se ejecutará automáticamente tras guardar. Tiempo estimado: <strong>2-5 minutos</strong>.</span>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { if (title) { onSave({ title, type, content }); onClose(); } }}>
          <MI name={isEdit ? 'save' : 'upload'} /> {isEdit ? 'Guardar Cambios' : 'Cargar y Entrenar'}
        </button>
      </div>
    </Modal>
  );
}

// ── 5. Test WhatsApp Connection ────────────────────────────────────────────────
type StepStatus = 'pending' | 'running' | 'success' | 'error';
interface TestStep { label: string; detail: string; status: StepStatus; }

function WhatsAppTestModal({ onClose }: { onClose: () => void }) {
  const [steps, setSteps] = useState<TestStep[]>([
    { label: 'Verificando credenciales Meta API', detail: 'Comprobando Phone ID y Access Token...', status: 'pending' },
    { label: 'Probando conexión al Webhook', detail: 'GET /webhooks/whatsapp → 200 OK', status: 'pending' },
    { label: 'Enviando mensaje de prueba', detail: 'Mensaje de sistema a número de prueba', status: 'pending' },
    { label: 'Verificando recepción', detail: 'Confirmando entrega del mensaje', status: 'pending' },
  ]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runTest = useCallback(async () => {
    setRunning(true);
    setDone(false);
    const reset = steps.map(s => ({ ...s, status: 'pending' as StepStatus }));
    setSteps(reset);

    for (let i = 0; i < reset.length; i++) {
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
      const ok = Math.random() > 0.1;
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: ok ? 'success' : 'error' } : s));
      if (!ok) break;
    }
    setRunning(false);
    setDone(true);
  }, []);

  const allOk = steps.every(s => s.status === 'success');
  const hasError = steps.some(s => s.status === 'error');

  const stepIcon = (s: StepStatus) => {
    if (s === 'success') return <div className="test-step-icon success"><MI name="check" /></div>;
    if (s === 'error')   return <div className="test-step-icon error"><MI name="close" /></div>;
    if (s === 'running') return <div className="test-step-icon running"><MI name="refresh" style={{ animation: 'spin 0.8s linear infinite' }} /></div>;
    return <div className="test-step-icon pending"><MI name="radio_button_unchecked" /></div>;
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="wifi_tethering" iconColor="green" title="Prueba de Conexión WhatsApp" subtitle="Verificación en tiempo real de la integración" onClose={onClose} />
      <div className="modal-body">
        {!running && !done && (
          <div className="inline-alert alert-info" style={{ marginBottom: 20 }}>
            <MI name="info" />
            <span>Se enviará un mensaje de prueba al número configurado. Asegúrate de que el webhook esté activo.</span>
          </div>
        )}
        {steps.map((step, i) => (
          <div key={i} className={`test-step step-${step.status}`}>
            {stepIcon(step.status)}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{step.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>{step.detail}</div>
            </div>
          </div>
        ))}
        {done && (
          <div className={`inline-alert ${allOk ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 8 }}>
            <MI name={allOk ? 'check_circle' : 'error'} />
            <span>{allOk
              ? '¡Todo en orden! Tu integración de WhatsApp está funcionando correctamente.'
              : 'Se encontraron errores. Verifica tus credenciales en Meta for Developers y vuelve a intentarlo.'}
            </span>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={runTest} disabled={running}>
          <MI name={running ? 'refresh' : 'play_arrow'} style={running ? { animation: 'spin 0.8s linear infinite' } : {}} />
          {running ? 'Probando...' : done ? 'Reintentar' : 'Iniciar Prueba'}
        </button>
      </div>
    </Modal>
  );
}

// ── 6. Change Password ─────────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const mismatch = next && confirm && next !== confirm;

  return (
    <Modal onClose={onClose} size="modal-sm">
      <ModalHeader icon="lock_reset" iconColor="purple" title="Cambiar Contraseña" subtitle="Usa una contraseña segura y única" onClose={onClose} />
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Contraseña Actual</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input" type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} placeholder="Tu contraseña actual" style={{ paddingRight: 44 }} />
            <button onClick={() => setShowCurrent(!showCurrent)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)' }}>
              <MI name={showCurrent ? 'visibility_off' : 'visibility'} style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nueva Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input" type={showNext ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} placeholder="Mínimo 8 caracteres" style={{ paddingRight: 44 }} />
            <button onClick={() => setShowNext(!showNext)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)' }}>
              <MI name={showNext ? 'visibility_off' : 'visibility'} style={{ fontSize: 18 }} />
            </button>
          </div>
          <PasswordStrength password={next} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Confirmar Nueva Contraseña</label>
          <input
            className="form-input" type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)} placeholder="Repite la nueva contraseña"
            style={{ borderColor: mismatch ? 'var(--color-error)' : undefined }}
          />
          {mismatch && <div style={{ color: 'var(--color-error)', fontSize: 12, marginTop: 4 }}>Las contraseñas no coinciden</div>}
        </div>
        <div className="inline-alert alert-info" style={{ marginTop: 20 }}>
          <MI name="security" />
          <div>
            <strong>Consejos:</strong>
            <ul style={{ marginTop: 4, paddingLeft: 16 }}>
              <li>Al menos 8 caracteres</li>
              <li>Combina letras, números y símbolos</li>
              <li>No reutilices contraseñas anteriores</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!current || !next || !!mismatch || next.length < 8}
          style={{ opacity: (!current || !next || !!mismatch || next.length < 8) ? 0.4 : 1 }}
          onClick={() => { onSave(); onClose(); }}>
          <MI name="lock" /> Actualizar Contraseña
        </button>
      </div>
    </Modal>
  );
}

// ── 7. Setup 2FA ───────────────────────────────────────────────────────────────
function Setup2FAModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtp = (val: string, idx: number) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp]; next[idx] = cleaned;
    setOtp(next);
    if (cleaned && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const QRPattern = [
    1,1,1,1,1,1,1,0,1,0,1,
    1,0,0,0,0,0,1,0,0,1,0,
    1,0,1,1,1,0,1,0,1,0,1,
    1,0,1,1,1,0,1,0,0,1,1,
    1,0,1,1,1,0,1,0,1,1,0,
    1,0,0,0,0,0,1,0,0,0,1,
    1,1,1,1,1,1,1,0,1,0,1,
    0,0,0,0,0,0,0,0,1,1,0,
    1,0,1,1,0,1,1,0,1,0,0,
    0,1,0,0,1,0,0,0,0,1,1,
    1,1,1,0,1,0,1,0,1,0,1,
  ];

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="phonelink_lock" iconColor="purple" title="Autenticación de Dos Factores (2FA)" subtitle={`Paso ${step} de 3`} onClose={onClose} />
      <div className="modal-body">
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? 'var(--color-secondary-container)' : 'var(--color-border-subtle)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <MI name="phonelink_lock" style={{ fontSize: 48, color: '#5b21b6', marginBottom: 16, display: 'block' }} />
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Activa la verificación en 2 pasos</h3>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 24 }}>
              Agrega una capa extra de seguridad a tu cuenta. Necesitarás una app de autenticación como <strong>Google Authenticator</strong> o <strong>Authy</strong>.
            </p>
            <div className="inline-alert alert-info" style={{ textAlign: 'left', marginBottom: 0 }}>
              <MI name="info" />
              <span>Esto protegerá tu cuenta incluso si alguien obtiene tu contraseña.</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 20 }}>
              Escanea este código QR con tu app de autenticación:
            </p>
            <div className="qr-container" style={{ marginBottom: 16 }}>
              <div className="qr-grid">
                {QRPattern.map((cell, i) => (
                  <div key={i} className="qr-cell" style={{ background: cell ? '#1a146b' : 'white' }} />
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginBottom: 4 }}>O ingresa este código manualmente:</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.15em', background: 'var(--color-surface-container)', padding: '10px 20px', borderRadius: 8, display: 'inline-block' }}>
                NEXU-3A7F-K9PQ-2M4R
              </div>
            </div>
            <div className="inline-alert alert-warning">
              <MI name="warning" />
              <span>Guarda este código en un lugar seguro. Es tu respaldo si pierdes acceso a tu app.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 8, textAlign: 'center' }}>
              Ingresa el código de 6 dígitos que muestra tu app:
            </p>
            <div className="otp-input-group">
              {otp.map((val, i) => (
                <input key={i} ref={el => { inputRefs.current[i] = el; }}
                  className="otp-input" value={val}
                  onChange={e => handleOtp(e.target.value, i)}
                  onKeyDown={e => handleOtpKey(e, i)}
                  maxLength={1} inputMode="numeric"
                />
              ))}
            </div>
            {otp.every(v => v) && (
              <div className="inline-alert alert-success" style={{ marginTop: 8 }}>
                <MI name="check_circle" />
                <span>¡Código válido! Haz clic en <strong>Activar 2FA</strong> para finalizar.</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={step === 1 ? onClose : () => setStep(s => (s - 1) as 1 | 2 | 3)}>
          {step === 1 ? 'Cancelar' : <><MI name="arrow_back" /> Atrás</>}
        </button>
        <button className="btn btn-primary"
          disabled={step === 3 && otp.some(v => !v)}
          style={{ opacity: step === 3 && otp.some(v => !v) ? 0.4 : 1 }}
          onClick={() => {
            if (step < 3) setStep(s => (s + 1) as 1 | 2 | 3);
            else { onSave(); onClose(); }
          }}>
          {step === 3 ? <><MI name="lock" /> Activar 2FA</> : <><MI name="arrow_forward" /> Siguiente</>}
        </button>
      </div>
    </Modal>
  );
}

// ── 8. Active Sessions ──────────────────────────────────────────────────────────
function ActiveSessionsModal({ onClose, showToast }: { onClose: () => void; showToast: (m: string, t?: ToastMsg['type']) => void }) {
  const [sessions, setSessions] = useState([
    { id: 'S1', device: 'Chrome — Windows 11', location: 'Bogotá, Colombia', ip: '181.52.xx.xx', lastActive: 'Ahora mismo', current: true, icon: 'computer' },
    { id: 'S2', device: 'Safari — iPhone 15', location: 'Medellín, Colombia', ip: '201.220.xx.xx', lastActive: 'Hace 3h', current: false, icon: 'smartphone' },
    { id: 'S3', device: 'Firefox — macOS', location: 'Cali, Colombia', ip: '190.14.xx.xx', lastActive: 'Hace 2 días', current: false, icon: 'laptop_mac' },
  ]);

  const revoke = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    showToast('Sesión cerrada correctamente', 'success');
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="devices" iconColor="indigo" title="Sesiones Activas" subtitle={`${sessions.length} dispositivos conectados`} onClose={onClose} />
      <div className="modal-body">
        <div className="inline-alert alert-info" style={{ marginBottom: 16 }}>
          <MI name="info" />
          <span>Puedes cerrar sesión en dispositivos que no reconozcas.</span>
        </div>
        {sessions.map(s => (
          <div key={s.id} className={`session-item${s.current ? ' current' : ''}`}>
            <div className="session-icon"><MI name={s.icon} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                {s.device}
                {s.current && <span className="badge badge-active" style={{ fontSize: 10 }}>Sesión actual</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                {s.location} · {s.ip}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 1 }}>
                <MI name="schedule" style={{ fontSize: 12, verticalAlign: 'middle' }} /> {s.lastActive}
              </div>
            </div>
            {!s.current && (
              <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                onClick={() => revoke(s.id)}>
                <MI name="logout" style={{ fontSize: 15 }} /> Cerrar
              </button>
            )}
          </div>
        ))}
        {sessions.length > 1 && (
          <button className="btn btn-outline" style={{ width: '100%', marginTop: 8, color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
            onClick={() => { setSessions(prev => prev.filter(s => s.current)); showToast('Todas las otras sesiones fueron cerradas', 'success'); }}>
            <MI name="logout" /> Cerrar Todas las Demás Sesiones
          </button>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}><MI name="check" /> Listo</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

function NavItem({ icon, label, active, onClick, badge }: { icon: string; label: string; active?: boolean; onClick: () => void; badge?: number }) {
  return (
    <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
      <MI name={icon} filled={active} />
      <span>{label}</span>
      {(badge ?? 0) > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView({ orders }: { orders: Order[] }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Dashboard</h2>
          <p><MI name="chat" />Resumen en tiempo real de tus ventas por WhatsApp</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline"><MI name="download" /> Exportar</button>
          <button className="btn btn-primary"><MI name="auto_awesome" /> Reporte IA</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6" style={{ marginBottom: 24 }}>
        {[
          { label: 'Ventas Hoy', value: '$348.90', icon: 'payments', color: 'indigo', change: '+18% vs ayer', up: true },
          { label: 'Pedidos Totales', value: `${orders.length + 15}`, icon: 'shopping_cart', color: 'blue', change: '+5 nuevos', up: true },
          { label: 'Chats IA Activos', value: '42', icon: 'forum', color: 'orange', change: '89% resueltos', up: true },
          { label: 'Nuevos Clientes', value: '9', icon: 'group', color: 'green', change: 'Esta semana', up: true },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><MI name={s.icon} filled /></div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className={`stat-change ${s.up ? 'up' : 'down'}`}><MI name={s.up ? 'trending_up' : 'trending_down'} />{s.change}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
        <div className="card"><div className="nexus-indicator" /><div className="card-body">
          <div className="section-title"><MI name="bar_chart" />Ventas por Canal (WhatsApp IA)</div>
          <div className="bar-chart">
            {[['35%','#312e81'],['55%','#312e81'],['78%','#312e81'],['100%','#2170e4']].map(([h,bg],i)=>(
              <div key={i} className="bar-chart-bar" style={{ height:h, background:bg }} />
            ))}
          </div>
          <div className="bar-chart-labels">{['Sem 1','Sem 2','Sem 3','Hoy ✦'].map(l=><span key={l}>{l}</span>)}</div>
        </div></div>

        <div className="card"><div className="nexus-indicator" /><div className="card-body">
          <div className="section-title"><MI name="insights" />Métricas de Rendimiento IA</div>
          {[
            { label: 'Precisión IA', value: '89%', pct: 89, color: 'var(--color-whatsapp-green)' },
            { label: 'Conversión WhatsApp', value: '24.5%', pct: 24.5, color: 'var(--color-secondary-container)' },
            { label: 'Tiempo Medio Despacho', value: '12.4 min', pct: 75, color: 'var(--color-primary)' },
            { label: 'Satisfacción Cliente', value: '96%', pct: 96, color: '#f59e0b' },
          ].map(m => (
            <div key={m.label} className="progress-bar-wrap">
              <div className="progress-bar-header"><span className="progress-bar-label">{m.label}</span><span className="progress-bar-value">{m.value}</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width:`${m.pct}%`, background:m.color }} /></div>
            </div>
          ))}
        </div></div>
      </div>

      <div className="card"><div className="nexus-indicator" />
        <div className="card-body" style={{ paddingBottom:0 }}>
          <div className="section-title"><MI name="receipt_long" />Últimos Pedidos WhatsApp</div>
        </div>
        <div className="data-table-wrapper" style={{ border:'none', borderRadius:0 }}>
          <table className="data-table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th style={{textAlign:'right'}}>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {orders.slice(0,5).map(o => (
                <tr key={o.id}>
                  <td><span className="font-mono" style={{color:'var(--color-primary)',fontWeight:700}}>#{o.id}</span></td>
                  <td style={{fontWeight:600}}>{o.customerName}</td>
                  <td style={{color:'var(--color-on-surface-variant)',fontSize:12}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td>
                  <td style={{textAlign:'right',fontWeight:700}}>${o.total.toFixed(2)}</td>
                  <td><span className={`badge ${o.status==='NEW'?'badge-new':o.status==='PREPARING'?'badge-preparing':o.status==='READY'?'badge-ready':'badge-delivered'}`}>
                    {o.status==='NEW'?'Nuevo':o.status==='PREPARING'?'Preparando':o.status==='READY'?'Listo':'Entregado'}
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── AI Knowledge ───────────────────────────────────────────────────────────────
function AIKnowledgeView({ showToast }: { showToast: (m: string, t?: ToastMsg['type']) => void }) {
  const [docs, setDocs] = useState<KBDocument[]>(INIT_KB);
  const [modal, setModal] = useState<'upload' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<KBDocument | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('Eres un asistente virtual de ventas oficial para FlowCommerce. Tu tono es amigable y profesional. Solo recomiendas productos del catálogo adjunto. Si no puedes responder algo, deriva educadamente al agente humano.');

  const typeColors: Record<KBDocument['type'], string> = { FAQ:'badge-new', CATALOG:'badge-active', POLICY:'badge-delivered', PROMO:'badge-preparing' };
  const iconColors: Record<KBDocument['type'], string> = { CATALOG:'indigo', PROMO:'orange', POLICY:'blue', FAQ:'green' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>AI Knowledge Base</h2>
          <p><MI name="psychology" />Base de conocimiento que alimenta al asistente IA de WhatsApp</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('upload'); }}>
            <MI name="upload_file" /> Cargar Documento
          </button>
          <button className="btn btn-secondary"><MI name="auto_awesome" /> Entrenar Modelo</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4" style={{ marginBottom:24 }}>
        {[
          { label:'Documentos', value: docs.length.toString(), icon:'description', color:'indigo' },
          { label:'Entrenados', value: docs.filter(d=>d.status==='TRAINED').length.toString(), icon:'check_circle', color:'green' },
          { label:'Pendientes', value: docs.filter(d=>d.status==='PENDING').length.toString(), icon:'pending', color:'orange' },
          { label:'Palabras Totales', value: docs.reduce((s,d)=>s+d.wordCount,0).toLocaleString(), icon:'text_fields', color:'blue' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><MI name={s.icon} filled /></div>
            <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{fontSize:22}}>{s.value}</div></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card"><div className="nexus-indicator" /><div className="card-body">
          <div className="section-title"><MI name="folder_open" />Documentos de Conocimiento</div>
          <div className="space-y">
            {docs.map(doc => (
              <div key={doc.id} className="kb-card">
                <div className="kb-card-header">
                  <div className={`kb-icon ${iconColors[doc.type]}`}><MI name={KB_ICONS[doc.type]} /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{doc.title}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span className={`badge ${typeColors[doc.type]}`}>{KB_TYPE_LABEL[doc.type]}</span>
                      <span style={{ fontSize:11, color:'var(--color-on-surface-variant)' }}>{doc.wordCount.toLocaleString()} palabras</span>
                    </div>
                  </div>
                  <span className={`badge ${doc.status==='TRAINED'?'badge-active':'badge-preparing'}`}>
                    {doc.status==='TRAINED'?'✓ Entrenado':'⏳ Pendiente'}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'var(--color-outline)' }}>
                    <MI name="schedule" style={{ fontSize:13, verticalAlign:'middle' }} /> {doc.lastUpdated}
                  </span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost" style={{ padding:'4px 10px', fontSize:12 }}
                      onClick={() => { setSelected(doc); setModal('edit'); }}>
                      <MI name="edit" style={{ fontSize:15 }} /> Editar
                    </button>
                    <button className="btn btn-ghost" style={{ padding:'4px 10px', fontSize:12, color:'var(--color-error)' }}
                      onClick={() => { setSelected(doc); setModal('delete'); }}>
                      <MI name="delete" style={{ fontSize:15 }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div></div>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card"><div className="nexus-indicator" /><div className="card-body">
            <div className="section-title"><MI name="smart_toy" />System Prompt del Agente IA</div>
            <div className="form-group" style={{ marginBottom:16 }}>
              <label className="form-label">Instrucciones Maestras</label>
              <textarea className="form-input" rows={6} value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)}
                style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />
              <div className="form-hint">Define la personalidad, contexto e instrucciones del agente de WhatsApp.</div>
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => showToast('System Prompt guardado correctamente', 'success')}>
              <MI name="save" /> Guardar Prompt
            </button>
          </div></div>

          <div className="card" style={{ background:'linear-gradient(135deg,var(--color-primary-container),var(--color-secondary-container))' }}>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <MI name="psychology" style={{ color:'white', fontSize:28 }} />
                <div>
                  <div style={{ fontWeight:700, color:'white', fontSize:15 }}>Estado del Modelo IA</div>
                  <div style={{ color:'rgba(255,255,255,0.75)', fontSize:12 }}>Nexus Intelligence v2.1</div>
                </div>
              </div>
              {[{label:'Precisión del Modelo',value:'94.2%'},{label:'Mensajes Procesados Hoy',value:'1,284'},{label:'Conversaciones Activas',value:'42'}].map(m=>(
                <div key={m.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color:'rgba(255,255,255,0.75)', fontSize:13 }}>{m.label}</span>
                  <span style={{ color:'white', fontWeight:700, fontSize:13 }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(modal === 'upload' || modal === 'edit') && (
        <DocumentModal
          document={modal === 'edit' ? selected ?? undefined : undefined}
          onClose={() => setModal(null)}
          onSave={data => {
            if (modal === 'edit' && selected) {
              setDocs(prev => prev.map(d => d.id === selected.id ? { ...d, ...data, lastUpdated: new Date().toISOString().split('T')[0], wordCount: (data.content?.split(' ').filter(Boolean).length) ?? d.wordCount } : d));
              showToast('Documento actualizado correctamente', 'success');
            } else {
              const newDoc: KBDocument = { id: `KB${Date.now()}`, title: data.title!, type: data.type ?? 'FAQ', wordCount: (data.content?.split(' ').filter(Boolean).length) ?? 0, lastUpdated: new Date().toISOString().split('T')[0], status: 'PENDING', content: data.content };
              setDocs(prev => [...prev, newDoc]);
              showToast('Documento cargado. Entrenamiento iniciado...', 'info');
            }
          }}
        />
      )}
      {modal === 'delete' && selected && (
        <DeleteModal
          title={`¿Eliminar "${selected.title}"?`}
          description="Se eliminará este documento de la base de conocimiento y el modelo dejará de usar su contenido."
          onClose={() => setModal(null)}
          onConfirm={() => { setDocs(prev => prev.filter(d => d.id !== selected.id)); showToast('Documento eliminado', 'success'); }}
        />
      )}
    </div>
  );
}

// ── Orders ─────────────────────────────────────────────────────────────────────
function OrdersView({ orders, onStartPreparing, onMarkReady, onDeliver }: {
  orders: Order[]; onStartPreparing:(id:string)=>void; onMarkReady:(id:string)=>void; onDeliver:(id:string)=>void;
}) {
  const [view, setView] = useState<'kanban'|'table'>('kanban');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const getMin = (d: Date) => Math.floor((Date.now()-d.getTime())/60000);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Gestión de Pedidos</h2>
          <p><MI name="chat" />{orders.length} pedidos activos · Generados por WhatsApp IA</p>
        </div>
        <div className="page-header-actions">
          <button className={`btn ${view==='kanban'?'btn-primary':'btn-outline'}`} onClick={()=>setView('kanban')}><MI name="view_kanban" /> KDS</button>
          <button className={`btn ${view==='table'?'btn-primary':'btn-outline'}`} onClick={()=>setView('table')}><MI name="table_rows" /> Tabla</button>
          <button className="btn btn-outline"><MI name="download" /> CSV</button>
        </div>
      </div>

      {view==='kanban' ? (
        <div className="kds-board">
          {(['NEW','PREPARING','READY'] as OrderStatus[]).map((col,ci) => {
            const colOrders = orders.filter(o=>o.status===col);
            const colColors = ['#1a146b','#312e81','var(--color-whatsapp-green)'];
            const colTitles = ['Nuevos','En Preparación','Listos / Despacho'];
            return (
              <div key={col} className="kds-column">
                <div className="kds-column-header">
                  <h3>{colTitles[ci]}</h3>
                  <span className="kds-column-count" style={{ background:colColors[ci] }}>{colOrders.length}</span>
                </div>
                <div className="kds-cards">
                  {colOrders.map(order => {
                    const elapsed = getMin(order.createdAt);
                    const isRed = col==='PREPARING' && elapsed>=25;
                    const isYellow = col==='PREPARING' && elapsed>=15 && elapsed<25;
                    return (
                      <div key={order.id} className={`order-card${isRed?' alert-critical':isYellow?' alert-warning':''}`}>
                        {isRed && <div className="alert-banner"><MI name="warning" />DEMORA CRÍTICA (+25 min)</div>}
                        <div className="order-header">
                          <div><div className="order-id">#{order.id}</div><div className="order-customer">{order.customerName}</div></div>
                          <span className={`order-timer ${isRed?'timer-critical':isYellow?'timer-warning':'timer-normal'}`}>
                            <MI name="schedule" />{elapsed} min
                          </span>
                        </div>
                        <div className="order-products">
                          <div className="order-products-label">Productos</div>
                          {order.items.map((it,i)=><div key={i} className="order-product-item" style={col==='READY'?{textDecoration:'line-through',color:'var(--color-outline)'}:{}}>{it.quantity}× {it.name}</div>)}
                        </div>
                        {order.notes && <div className="order-note"><strong>🤖 NOTA IA: </strong>{order.notes}</div>}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight:700, fontSize:14, color:'var(--color-primary)' }}>${order.total.toFixed(2)}</span>
                          <span className="badge badge-new" style={{ fontSize:11 }}>{order.paymentMethod}</span>
                        </div>
                        {col==='NEW' && <button className="btn btn-secondary" style={{ width:'100%', padding:'10px' }} onClick={()=>onStartPreparing(order.id)}><MI name="restaurant" />INICIAR PREPARACIÓN</button>}
                        {col==='PREPARING' && <button className="btn btn-success" style={{ width:'100%', padding:'10px' }} onClick={()=>onMarkReady(order.id)}><MI name="done_all" />MARCAR COMO LISTO</button>}
                        {col==='READY' && <button className="btn btn-primary" style={{ width:'100%', padding:'10px' }} onClick={()=>onDeliver(order.id)}><MI name="local_shipping" />MARCAR ENTREGADO</button>}
                      </div>
                    );
                  })}
                  {colOrders.length===0 && <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--color-outline)' }}><MI name="check_circle" style={{ fontSize:32, color:'var(--color-success-emerald)', display:'block', marginBottom:8 }} /><div style={{ fontSize:13 }}>Sin pedidos</div></div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="filter-bar">
            <div className="filter-select-wrap">
              <MI name="filter_list" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--color-outline)' }} />
              <select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="ALL">Todos</option><option value="NEW">Nuevos</option><option value="PREPARING">Preparando</option><option value="READY">Listos</option>
              </select>
            </div>
            <div className="auto-sync-badge"><MI name="sync" />Auto-sync activo</div>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Productos</th><th style={{textAlign:'right'}}>Total</th><th>Pago</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
              <tbody>
                {orders.filter(o=>filterStatus==='ALL'||o.status===filterStatus).map(o=>(
                  <tr key={o.id}>
                    <td><span className="font-mono" style={{color:'var(--color-primary)',fontWeight:700}}>#{o.id}</span></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:34,height:34,borderRadius:'50%',background:'#e2dfff',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>{getInitials(o.customerName)}</div><div style={{fontWeight:600}}>{o.customerName}</div></div></td>
                    <td style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td>
                    <td style={{textAlign:'right',fontWeight:700}}>${o.total.toFixed(2)}</td>
                    <td><span className="badge badge-new">{o.paymentMethod}</span></td>
                    <td><span className={`badge ${o.status==='NEW'?'badge-new':o.status==='PREPARING'?'badge-preparing':o.status==='READY'?'badge-ready':'badge-delivered'}`}>{o.status==='NEW'?'Nuevo':o.status==='PREPARING'?'Preparando':o.status==='READY'?'Listo':'Entregado'}</span></td>
                    <td style={{textAlign:'right'}}><div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                      {o.status==='NEW'&&<button className="btn btn-secondary" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onStartPreparing(o.id)}>Preparar</button>}
                      {o.status==='PREPARING'&&<button className="btn btn-success" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onMarkReady(o.id)}>Listo</button>}
                      {o.status==='READY'&&<button className="btn btn-primary" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onDeliver(o.id)}>Entregar</button>}
                    </div></td>
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

// ── Customers ─────────────────────────────────────────────────────────────────
function CustomersView({ showToast }: { showToast: (m: string, t?: ToastMsg['type']) => void }) {
  const [customers, setCustomers] = useState<Customer[]>(INIT_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'new' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Clientes</h2>
          <p><MI name="group" />{customers.length} clientes registrados · Captados por WhatsApp IA</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline"><MI name="download" /> Exportar</button>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('new'); }}><MI name="person_add" /> Nuevo Cliente</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4" style={{ marginBottom:24 }}>
        {[
          { label:'Total Clientes', value: customers.length.toString(), icon:'group', color:'indigo' },
          { label:'Activos', value: customers.filter(c=>c.status==='ACTIVE').length.toString(), icon:'verified_user', color:'green' },
          { label:'Pedidos Totales', value: customers.reduce((s,c)=>s+c.totalOrders,0).toString(), icon:'shopping_bag', color:'blue' },
          { label:'Facturación Total', value: `$${customers.reduce((s,c)=>s+c.totalSpend,0).toFixed(0)}`, icon:'attach_money', color:'orange' },
        ].map(s=>(
          <div key={s.label} className="stat-card"><div className={`stat-icon ${s.color}`}><MI name={s.icon} filled /></div><div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div></div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <div className="topbar-search" style={{ flex:1, maxWidth:380 }}>
          <MI name="search" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..." />
        </div>
        <div className="filter-select-wrap">
          <MI name="filter_list" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--color-outline)' }} />
          <select className="filter-select" style={{ paddingTop:10, paddingBottom:10 }}>
            <option>Todos</option><option>Activos</option><option>Inactivos</option>
          </select>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Cliente</th><th>Teléfono</th><th style={{textAlign:'center'}}>Pedidos</th><th style={{textAlign:'right'}}>Gasto Total</th><th>Desde</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id}>
                <td><div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:c.avatarColor, color:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>{c.initials}</div>
                  <div><div style={{ fontWeight:600 }}>{c.name}</div>{c.email&&<div style={{ fontSize:11, color:'var(--color-outline)' }}>{c.email}</div>}</div>
                </div></td>
                <td style={{ fontFamily:'monospace', fontSize:13 }}>{c.phone}</td>
                <td style={{ textAlign:'center', fontWeight:700 }}>{c.totalOrders}</td>
                <td style={{ textAlign:'right', fontWeight:700, color:'var(--color-primary)' }}>${c.totalSpend.toFixed(2)}</td>
                <td style={{ fontSize:12, color:'var(--color-on-surface-variant)' }}>{c.joinDate}</td>
                <td><span className={`badge ${c.status==='ACTIVE'?'badge-active':'badge-inactive'}`}>{c.status==='ACTIVE'?'Activo':'Inactivo'}</span></td>
                <td style={{ textAlign:'right' }}><div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                  <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:12 }} title="Chat WhatsApp"><MI name="chat" style={{ fontSize:15 }} /></button>
                  <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:12 }} onClick={()=>{ setSelected(c); setModal('edit'); }} title="Editar"><MI name="edit" style={{ fontSize:15 }} /></button>
                  <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:12, color:'var(--color-error)' }} onClick={()=>{ setSelected(c); setModal('delete'); }} title="Eliminar"><MI name="delete" style={{ fontSize:15 }} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal==='new'||modal==='edit') && (
        <CustomerModal
          customer={modal==='edit' ? selected ?? undefined : undefined}
          onClose={()=>setModal(null)}
          onSave={data => {
            if (modal==='edit' && selected) {
              setCustomers(prev=>prev.map(c=>c.id===selected.id?{...c,...data}:c));
              showToast('Cliente actualizado correctamente', 'success');
            } else {
              const name = data.name ?? '';
              const newC: Customer = { id:`C${Date.now()}`, name, phone:data.phone??'', email:data.email, totalOrders:0, totalSpend:0, status:'ACTIVE', joinDate:new Date().toISOString().split('T')[0], initials:getInitials(name), avatarColor: AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)] };
              setCustomers(prev=>[...prev, newC]);
              showToast('Nuevo cliente creado', 'success');
            }
          }}
        />
      )}
      {modal==='delete' && selected && (
        <DeleteModal
          title={`¿Eliminar a "${selected.name}"?`}
          description="Se eliminará su historial de pedidos y datos de contacto del sistema."
          onClose={()=>setModal(null)}
          onConfirm={()=>{ setCustomers(prev=>prev.filter(c=>c.id!==selected.id)); showToast('Cliente eliminado', 'success'); }}
        />
      )}
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────
function SettingsView({ showToast }: { showToast: (m: string, t?: ToastMsg['type']) => void }) {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('business-profile');
  const [team, setTeam] = useState<TeamMember[]>(INIT_TEAM);
  const [modal, setModal] = useState<ModalKey>(null);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [waCfg, setWaCfg] = useState({ phoneId:'109283746501928', verifyToken:'flowcommerce_wh_2026', accessToken:'EAAGb37...z9P2kd8s', webhookUrl:'https://api.flowcommerce.io/webhooks/whatsapp' });

  const settingsTabs: {key:SettingsTab; label:string; icon:string}[] = [
    {key:'business-profile', label:'Perfil del Negocio', icon:'storefront'},
    {key:'team-management', label:'Gestión de Equipo', icon:'groups'},
    {key:'whatsapp-integration', label:'WhatsApp & IA', icon:'chat'},
    {key:'billing-security', label:'Facturación & Seguridad', icon:'security'},
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Configuración</h2>
          <p><MI name="settings" />Administra tu cuenta, integraciones y preferencias del sistema</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          <div className="settings-sidebar-card">
            {settingsTabs.map(t=>(
              <button key={t.key} className={`settings-nav-item${settingsTab===t.key?' active':''}`} onClick={()=>setSettingsTab(t.key)}>
                <MI name={t.icon} filled={settingsTab===t.key} />{t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-content">

          {/* Business Profile */}
          {settingsTab==='business-profile' && (
            <div className="card"><div className="nexus-indicator" /><div className="card-body">
              <div className="section-title"><MI name="storefront" />Perfil del Negocio</div>
              <p style={{ fontSize:13, color:'var(--color-on-surface-variant)', marginBottom:24 }}>Administra los datos de tu empresa y preferencias globales.</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {label:'Nombre del Negocio', val:'Pizzería Nexus', type:'text'},
                  {label:'Industria', val:'Restaurante & Delivery', type:'text'},
                  {label:'País / Región', val:'Colombia', type:'text'},
                  {label:'Zona Horaria', val:'America/Bogota (UTC-5)', type:'text'},
                  {label:'Email de Contacto', val:'hola@pizzerianexus.com', type:'email'},
                  {label:'Teléfono Principal', val:'+57 300 123 4567', type:'tel'},
                ].map(f=>(
                  <div key={f.label} className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={f.type} defaultValue={f.val} />
                  </div>
                ))}
              </div>
              <div className="form-group" style={{ marginTop:20 }}>
                <label className="form-label">Descripción del Negocio</label>
                <textarea className="form-input" rows={3} defaultValue="Pizzería artesanal con delivery propio. Especialistas en pizzas de masa madre y hamburguesas gourmet." />
              </div>
              <div className="divider" />
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button className="btn btn-outline">Cancelar</button>
                <button className="btn btn-primary" onClick={()=>showToast('Perfil guardado correctamente','success')}><MI name="save" />Guardar Cambios</button>
              </div>
            </div></div>
          )}

          {/* Team Management */}
          {settingsTab==='team-management' && (
            <div className="card"><div className="nexus-indicator" /><div className="card-body">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div className="section-title" style={{ marginBottom:0 }}><MI name="groups" />Gestión de Equipo</div>
                <button className="btn btn-primary" onClick={()=>{ setSelected(null); setModal('invite-member'); }}><MI name="person_add" />Invitar Miembro</button>
              </div>
              <p style={{ fontSize:13, color:'var(--color-on-surface-variant)', marginBottom:24 }}>Administra los accesos y roles de tu equipo de trabajo.</p>
              <div className="data-table-wrapper" style={{ boxShadow:'none' }}>
                <table className="data-table">
                  <thead><tr><th>Miembro</th><th>Rol</th><th>Último Acceso</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
                  <tbody>
                    {team.map(m=>(
                      <tr key={m.id}>
                        <td><div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--color-primary-fixed)', color:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>{m.initials}</div>
                          <div><div style={{ fontWeight:600, fontSize:13 }}>{m.name}</div><div style={{ fontSize:11, color:'var(--color-outline)' }}>{m.email}</div></div>
                        </div></td>
                        <td><span className={`role-badge ${ROLE_CLASS[m.role]}`}><MI name={m.role==='Super Admin'?'shield':m.role==='Operador KDS'?'restaurant':'smart_toy'} style={{ fontSize:12 }} />{m.role}</span></td>
                        <td style={{ fontSize:12, color:'var(--color-on-surface-variant)' }}>{m.lastAccess}</td>
                        <td><span className={`badge ${m.status==='ACTIVE'?'badge-active':'badge-inactive'}`}>{m.status==='ACTIVE'?'Activo':'Inactivo'}</span></td>
                        <td style={{ textAlign:'right' }}><div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button className="btn btn-ghost" style={{ padding:'4px 10px', fontSize:12 }} onClick={()=>{ setSelected(m); setModal('edit-member'); }}><MI name="edit" style={{ fontSize:15 }} /></button>
                          <button className="btn btn-ghost" style={{ padding:'4px 10px', fontSize:12, color:'var(--color-error)' }} onClick={()=>{ setSelected(m); setModal('delete-member'); }}><MI name="person_remove" style={{ fontSize:15 }} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div></div>
          )}

          {/* WhatsApp & AI */}
          {settingsTab==='whatsapp-integration' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div className="card"><div className="nexus-indicator" /><div className="card-body">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div className="section-title" style={{ marginBottom:0 }}><MI name="chat" />Configuración WhatsApp Business API</div>
                  <button className="btn btn-outline" onClick={()=>setModal('test-whatsapp')}><MI name="wifi_tethering" />Probar Conexión</button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <div className="status-indicator status-connected"><div className="status-indicator-dot" />Webhook Conectado</div>
                  <span style={{ fontSize:12, color:'var(--color-on-surface-variant)' }}>Última verificación: hace 2 min</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">WhatsApp Phone ID</label><input className="form-input" value={waCfg.phoneId} onChange={e=>setWaCfg({...waCfg,phoneId:e.target.value})} /></div>
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Webhook Verify Token</label><input className="form-input" value={waCfg.verifyToken} onChange={e=>setWaCfg({...waCfg,verifyToken:e.target.value})} /></div>
                  <div className="form-group" style={{ marginBottom:0, gridColumn:'span 2' }}><label className="form-label">Meta Access Token</label><input className="form-input font-mono" type="password" value={waCfg.accessToken} onChange={e=>setWaCfg({...waCfg,accessToken:e.target.value})} /></div>
                  <div className="form-group" style={{ marginBottom:0, gridColumn:'span 2' }}>
                    <label className="form-label">Webhook URL (para Meta)</label>
                    <div style={{ display:'flex', gap:8 }}>
                      <input className="form-input font-mono" readOnly value={waCfg.webhookUrl} style={{ flex:1 }} />
                      <button className="btn btn-outline" onClick={()=>{navigator.clipboard?.writeText(waCfg.webhookUrl); showToast('URL copiada al portapapeles','success');}}><MI name="content_copy" style={{ fontSize:16 }} /></button>
                    </div>
                    <div className="form-hint">Pega esta URL en tu configuración de Meta for Developers.</div>
                  </div>
                </div>
                <div className="divider" />
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                  <button className="btn btn-outline" onClick={()=>setModal('test-whatsapp')}><MI name="refresh" />Probar Conexión</button>
                  <button className="btn btn-primary" onClick={()=>showToast('Configuración WhatsApp guardada','success')}><MI name="save" />Guardar</button>
                </div>
              </div></div>

              <div className="card"><div className="nexus-indicator" /><div className="card-body">
                <div className="section-title"><MI name="smart_toy" />Configuración del Agente IA</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Proveedor de IA</label><select className="form-input"><option>Google Gemini (Recomendado)</option><option>OpenAI GPT-4o</option><option>Anthropic Claude 3</option></select></div>
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Temperatura del Modelo</label><input className="form-input" type="number" defaultValue={0.7} min={0} max={1} step={0.1} /><div className="form-hint">0 = Determinístico · 1 = Creativo</div></div>
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Tiempo máx. de respuesta</label><input className="form-input" defaultValue="30 segundos" /></div>
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Idioma predeterminado</label><select className="form-input"><option>Español (Colombia)</option><option>English (US)</option><option>Português (BR)</option></select></div>
                </div>
                <div className="divider" />
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button className="btn btn-primary" onClick={()=>showToast('Configuración IA guardada','success')}><MI name="save" />Guardar Configuración</button>
                </div>
              </div></div>
            </div>
          )}

          {/* Billing & Security */}
          {settingsTab==='billing-security' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div className="card" style={{ background:'linear-gradient(135deg,var(--color-primary) 0%,var(--color-secondary-container) 100%)' }}>
                <div className="card-body">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Plan Actual</div>
                      <div style={{ color:'white', fontSize:28, fontWeight:800, marginTop:4 }}>Professional</div>
                      <div style={{ color:'rgba(255,255,255,0.8)', fontSize:14, marginTop:2 }}>$49.00 USD / mes · Renueva Jun 30, 2026</div>
                    </div>
                    <button className="btn" style={{ background:'white', color:'var(--color-primary)', fontWeight:700 }}><MI name="upgrade" />Actualizar</button>
                  </div>
                  <div style={{ display:'flex', gap:24, marginTop:20 }}>
                    {[{label:'Mensajes / mes',used:'12,450',total:'25,000'},{label:'Productos IA',used:'5',total:'10'},{label:'Agentes activos',used:'2',total:'5'}].map(m=>(
                      <div key={m.label}><div style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:700, marginBottom:4 }}>{m.label}</div><div style={{ color:'white', fontWeight:700 }}>{m.used} <span style={{ opacity:0.6, fontWeight:400 }}>/ {m.total}</span></div></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card"><div className="nexus-indicator" /><div className="card-body">
                <div className="section-title"><MI name="credit_card" />Método de Pago</div>
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', background:'var(--color-surface-soft)', borderRadius:10, border:'1px solid var(--color-border-subtle)' }}>
                  <MI name="credit_card" style={{ fontSize:28, color:'var(--color-primary)' }} />
                  <div style={{ flex:1 }}><div style={{ fontWeight:700 }}>•••• •••• •••• 4242</div><div style={{ fontSize:12, color:'var(--color-on-surface-variant)' }}>Visa · Vence 12/2028</div></div>
                  <span className="badge badge-active">Principal</span>
                  <button className="btn btn-ghost" style={{ padding:'5px 10px' }}><MI name="edit" style={{ fontSize:16 }} /></button>
                </div>
                <div style={{ marginTop:12 }}><button className="btn btn-outline"><MI name="add" />Agregar Método de Pago</button></div>
              </div></div>

              <div className="card"><div className="nexus-indicator" /><div className="card-body">
                <div className="section-title"><MI name="lock" />Seguridad de la Cuenta</div>
                {[
                  { label:'Cambiar Contraseña', desc:'Última vez hace 30 días', icon:'key', action:()=>setModal('change-password'), badge:'' },
                  { label:'Autenticación de Dos Factores (2FA)', desc:'No configurado · Recomendado', icon:'phonelink_lock', action:()=>setModal('setup-2fa'), badge:'Recomendado' },
                  { label:'Sesiones Activas', desc:'2 dispositivos conectados', icon:'devices', action:()=>setModal('active-sessions'), badge:'' },
                ].map(s=>(
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 0', borderBottom:'1px solid var(--color-border-subtle)' }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:'var(--color-primary-fixed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <MI name={s.icon} style={{ color:'var(--color-primary)', fontSize:20 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                        {s.label}
                        {s.badge && <span className="badge badge-preparing" style={{ fontSize:10 }}>{s.badge}</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--color-on-surface-variant)', marginTop:2 }}>{s.desc}</div>
                    </div>
                    <button className="btn btn-outline" style={{ fontSize:12 }} onClick={s.action}>Configurar</button>
                  </div>
                ))}
              </div></div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modals */}
      {(modal==='invite-member'||modal==='edit-member') && (
        <MemberModal
          member={modal==='edit-member' ? selected ?? undefined : undefined}
          onClose={()=>setModal(null)}
          onSave={data=>{
            if (modal==='edit-member' && selected) {
              setTeam(prev=>prev.map(m=>m.id===selected.id?{...m,...data}:m));
              showToast('Miembro actualizado correctamente','success');
            } else {
              const newM: TeamMember = { id:`T${Date.now()}`, initials:getInitials(data.name), lastAccess:'Pendiente de activación', ...data };
              setTeam(prev=>[...prev, newM]);
              showToast(`Invitación enviada a ${data.email}`,'success');
            }
          }}
        />
      )}
      {modal==='delete-member' && selected && (
        <DeleteModal
          title={`¿Eliminar a "${selected.name}"?`}
          description="Se revocarán todos sus accesos y no podrá iniciar sesión en la plataforma."
          onClose={()=>setModal(null)}
          onConfirm={()=>{ setTeam(prev=>prev.filter(m=>m.id!==selected.id)); showToast('Miembro eliminado del equipo','success'); }}
        />
      )}
      {modal==='test-whatsapp' && <WhatsAppTestModal onClose={()=>setModal(null)} />}
      {modal==='change-password' && <ChangePasswordModal onClose={()=>setModal(null)} onSave={()=>showToast('Contraseña actualizada correctamente','success')} />}
      {modal==='setup-2fa' && <Setup2FAModal onClose={()=>setModal(null)} onSave={()=>showToast('2FA activado exitosamente 🔐','success')} />}
      {modal==='active-sessions' && <ActiveSessionsModal onClose={()=>setModal(null)} showToast={showToast} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastMsg['type'] = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [orders, setOrders] = useState<Order[]>([
    { id:'1042', customerName:'Isaac Mendoza', phone:'573001234567', paymentMethod:'WhatsApp Pay',
      items:[{name:'Pizza Familiar Pepperoni',quantity:1,price:14.99},{name:'Gaseosa Coca-Cola 2L',quantity:1,price:3.50}],
      total:18.49, createdAt:new Date(Date.now()-28*60*1000), status:'PREPARING', notes:'Sin cebolla. Alérgeno: Lácteos.' },
    { id:'1043', customerName:'Laura Gómez', phone:'573129876543', paymentMethod:'Efectivo',
      items:[{name:'Hamburguesa Nexus doble queso',quantity:2,price:9.50},{name:'Papas fritas grandes',quantity:1,price:4.00}],
      total:23.00, createdAt:new Date(Date.now()-17*60*1000), status:'PREPARING' },
    { id:'1044', customerName:'Carlos Ruiz', phone:'573155554433', paymentMethod:'QR',
      items:[{name:'Alitas BBQ x12',quantity:1,price:11.00}],
      total:11.00, createdAt:new Date(Date.now()-3*60*1000), status:'NEW' },
    { id:'1041', customerName:'Sofía Silva', phone:'573009998877', paymentMethod:'WhatsApp Pay',
      items:[{name:'Pizza Margherita',quantity:1,price:12.50}],
      total:12.50, createdAt:new Date(Date.now()-38*60*1000), status:'READY' },
  ]);

  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(()=>setTick(n=>n+1),1000); return ()=>clearInterval(t); }, []);

  useEffect(() => {
    const sim = setInterval(() => {
      const names=['Patricia Rojas','Roberto Díaz','Ana Martínez','Felipe Torres'];
      const products=['Pizza Hawaiana','Combo Familiar','Alitas x6','Hamburguesa Clásica'];
      const methods=['WhatsApp Pay','Efectivo','QR'];
      const product=products[Math.floor(Math.random()*products.length)];
      const price=parseFloat((8+Math.random()*20).toFixed(2));
      const newOrder:Order={
        id:Math.floor(1050+Math.random()*900).toString(),
        customerName:names[Math.floor(Math.random()*names.length)],
        phone:'57300'+Math.floor(1000000+Math.random()*9000000),
        paymentMethod:methods[Math.floor(Math.random()*methods.length)],
        items:[{name:product,quantity:1,price}], total:price,
        createdAt:new Date(), status:'NEW',
      };
      setOrders(prev=>[...prev,newOrder]);
      showToast(`Nuevo pedido #${newOrder.id} de ${newOrder.customerName}`,'info');
      try {
        const ctx=new(window.AudioContext||(window as any).webkitAudioContext)();
        const osc=ctx.createOscillator(); const gain=ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880,ctx.currentTime);
        gain.gain.setValueAtTime(0.08,ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime+0.12);
      } catch{}
    },45000);
    return ()=>clearInterval(sim);
  },[showToast]);

  const handleStartPreparing = (id:string) => setOrders(p=>p.map(o=>o.id===id?{...o,status:'PREPARING',createdAt:new Date()}:o));
  const handleMarkReady = (id:string) => setOrders(p=>p.map(o=>o.id===id?{...o,status:'READY'}:o));
  const handleDeliver = (id:string) => setOrders(p=>p.filter(o=>o.id!==id));

  const newCount = orders.filter(o=>o.status==='NEW').length;
  const tabTitles:Record<TabKey,string> = { dashboard:'Dashboard', 'ai-knowledge':'AI Knowledge Base', orders:'Gestión de Pedidos', customers:'Clientes', settings:'Configuración' };

  return (
    <>
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined filled" style={{ fontSize:20, position:'relative', zIndex:1 }}>hexagon</span>
          </div>
          <div className="sidebar-logo-text"><h1>Nexus AI</h1><p>Sales Automation</p></div>
        </div>
        <div className="sidebar-nav">
          <NavItem icon="dashboard" label="Dashboard" active={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} />
          <NavItem icon="psychology" label="AI Knowledge Base" active={activeTab==='ai-knowledge'} onClick={()=>setActiveTab('ai-knowledge')} />
          <NavItem icon="shopping_cart" label="Pedidos" active={activeTab==='orders'} onClick={()=>setActiveTab('orders')} badge={newCount} />
          <NavItem icon="group" label="Clientes" active={activeTab==='customers'} onClick={()=>setActiveTab('customers')} />
          <NavItem icon="settings" label="Configuración" active={activeTab==='settings'} onClick={()=>setActiveTab('settings')} />
        </div>
        <div className="sidebar-bottom">
          <button className="btn-upgrade"><MI name="auto_awesome" />Upgrade to Pro</button>
          <button className="nav-item-small"><MI name="help" style={{ fontSize:18 }} />Help Center</button>
          <button className="nav-item-small"><MI name="logout" style={{ fontSize:18 }} />Cerrar Sesión</button>
        </div>
      </nav>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-search">
              <MI name="search" />
              <input placeholder={`Buscar en ${tabTitles[activeTab]}...`} />
            </div>
          </div>
          <div className="topbar-right">
            <div className="status-indicator status-connected" style={{ padding:'4px 12px', fontSize:11 }}>
              <div className="status-indicator-dot" />WhatsApp: Activo
            </div>
            <button className="topbar-icon-btn"><MI name="notifications" /><span className="notification-dot" /></button>
            <button className="topbar-icon-btn"><MI name="bolt" /><span className="notification-dot active-dot" /></button>
            <div className="topbar-avatar">GC</div>
          </div>
        </header>

        <div className="page-canvas">
          {activeTab==='dashboard'     && <DashboardView orders={orders} />}
          {activeTab==='ai-knowledge'  && <AIKnowledgeView showToast={showToast} />}
          {activeTab==='orders'        && <OrdersView orders={orders} onStartPreparing={handleStartPreparing} onMarkReady={handleMarkReady} onDeliver={handleDeliver} />}
          {activeTab==='customers'     && <CustomersView showToast={showToast} />}
          {activeTab==='settings'      && <SettingsView showToast={showToast} />}
        </div>
      </div>

      {/* Toast System */}
      <ToastContainer toasts={toasts} dismiss={dismissToast} />
    </>
  );
}
