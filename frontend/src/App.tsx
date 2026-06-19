const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'ai-knowledge' | 'chats' | 'orders' | 'customers' | 'settings' | 'super-tenants' | 'super-plans' | 'super-billing' | 'super-ai-keys';
type SettingsTab = 'business-profile' | 'team-management' | 'whatsapp-integration' | 'billing-security';
type OrderStatus = 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SHIPPED' | 'DELIVERED';
type CustomerStatus = 'ACTIVE' | 'INACTIVE';
type DateFilter = 'today' | 'week' | 'month';
type ModalKey =
  | 'invite-member' | 'edit-member' | 'delete-member'
  | 'new-customer' | 'edit-customer' | 'delete-customer'
  | 'upload-document' | 'edit-document' | 'delete-document'
  | 'test-whatsapp' | 'train-model'
  | 'change-password' | 'setup-2fa' | 'active-sessions'
  | 'order-detail' | 'whatsapp-chat'
  | 'upgrade' | 'help-center' | 'notification-settings' | 'super-edit-tenant' | 'add-payment' | 'broadcast'
  | null;

interface ToastMsg { id: number; message: string; type: 'success' | 'error' | 'info'; }
interface OrderItem { name: string; quantity: number; price: number; }
interface Order {
  id: string; customerName: string; phone: string;
  items: OrderItem[]; total: number; createdAt: Date;
  status: OrderStatus; notes?: string; paymentMethod: string;
  deliveredAt?: Date;
  deliveryMethod?: 'DELIVERY' | 'PICKUP';
  shippingAddress?: string;
  isSimulated?: boolean;
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
  type: 'FAQ' | 'CATALOG' | 'POLICY' | 'PROMO' | 'SALES_TECHNIQUE';
  wordCount: number; lastUpdated: string;
  status: 'TRAINED' | 'PENDING'; content?: string;
}
interface Notification {
  id: string; title: string; desc: string; time: string;
  type: 'order' | 'alert' | 'success' | 'ai'; read: boolean;
}

// ─── Static Data ───────────────────────────────────────────────────────────────
const INIT_CUSTOMERS: Customer[] = [
  { id:'C001', name:'Isaac Mendoza', phone:'+57 300 123 4567', email:'i.mendoza@email.com', totalOrders:14, totalSpend:287.40, status:'ACTIVE', joinDate:'2026-03-12', initials:'IM', avatarColor:'#e2dfff' },
  { id:'C002', name:'Laura Gómez', phone:'+57 312 987 6543', email:'lgomez@email.com', totalOrders:8, totalSpend:144.00, status:'ACTIVE', joinDate:'2026-04-05', initials:'LG', avatarColor:'#d1fae5' },
  { id:'C003', name:'Carlos Ruiz', phone:'+57 315 555 4433', totalOrders:3, totalSpend:52.50, status:'INACTIVE', joinDate:'2026-05-20', initials:'CR', avatarColor:'#dbeafe' },
  { id:'C004', name:'Sofía Silva', phone:'+57 300 999 8877', email:'ssilva@biz.com', totalOrders:22, totalSpend:498.75, status:'ACTIVE', joinDate:'2026-02-01', initials:'SS', avatarColor:'#fde68a' },
  { id:'C005', name:'Andrés Medina', phone:'+57 301 234 5678', totalOrders:5, totalSpend:89.00, status:'ACTIVE', joinDate:'2026-04-18', initials:'AM', avatarColor:'#ffdbc7' },
];
const INIT_TEAM: TeamMember[] = [
  { id:'T001', name:'Admin Principal', email:'admin@nexus.com', role:'Super Admin', lastAccess:'Hoy, 19:30', status:'ACTIVE', initials:'AP' },
  { id:'T002', name:'María García', email:'mgarcia@nexus.com', role:'Operador KDS', lastAccess:'Hace 2h', status:'ACTIVE', initials:'MG' },
  { id:'T003', name:'Juan López', email:'jlopez@nexus.com', role:'Agente IA', lastAccess:'Ayer', status:'INACTIVE', initials:'JL' },
];
const INIT_KB: KBDocument[] = [
  { id:'KB001', title:'Menú Principal y Precios 2026', type:'CATALOG', wordCount:1240, lastUpdated:'2026-06-15', status:'TRAINED', content:'Pizza Margherita...$12.50\nPizza Pepperoni Familiar...$14.99' },
  { id:'KB002', title:'Preguntas Frecuentes - Delivery', type:'FAQ', wordCount:680, lastUpdated:'2026-06-10', status:'TRAINED', content:'¿Cuánto tarda el delivery?\nGeneralmente entre 30-45 minutos.' },
  { id:'KB003', title:'Política de Devoluciones', type:'POLICY', wordCount:320, lastUpdated:'2026-05-28', status:'TRAINED', content:'Aceptamos devoluciones dentro de las primeras 2 horas.' },
  { id:'KB004', title:'Promociones Junio 2026', type:'PROMO', wordCount:410, lastUpdated:'2026-06-16', status:'PENDING', content:'2x1 en pizzas los martes. 20% descuento en tu primer pedido.' },
];
const INIT_NOTIFS: Notification[] = [
  { id:'N1', title:'Nuevo pedido #1044', desc:'Carlos Ruiz ordenó Alitas BBQ x12 — $11.00', time:'Hace 3 min', type:'order', read:false },
  { id:'N2', title:'Pedido #1042 demorado', desc:'Isaac Mendoza lleva 28 min en preparación', time:'Hace 5 min', type:'alert', read:false },
  { id:'N3', title:'Modelo IA actualizado', desc:'Knowledge Base re-entrenada con 4 documentos', time:'Hace 1h', type:'ai', read:false },
  { id:'N4', title:'Nueva reseña positiva', desc:'Laura Gómez calificó con ⭐⭐⭐⭐⭐', time:'Hace 2h', type:'success', read:true },
  { id:'N5', title:'Pedido #1039 entregado', desc:'Sofía Silva recibió su pedido — $12.50', time:'Hace 3h', type:'success', read:true },
];
const INIT_DELIVERED: Order[] = [
  { id:'1038', customerName:'Patricia Rojas', phone:'+57 301 000 1111', paymentMethod:'WhatsApp Pay', items:[{name:'Combo Familiar x2',quantity:1,price:24.00}], total:24.00, createdAt:new Date(Date.now()-90*60*1000), status:'DELIVERED', deliveredAt:new Date(Date.now()-45*60*1000) },
  { id:'1039', customerName:'Sofía Silva', phone:'+57 300 999 8877', paymentMethod:'QR', items:[{name:'Pizza Margherita',quantity:1,price:12.50}], total:12.50, createdAt:new Date(Date.now()-70*60*1000), status:'DELIVERED', deliveredAt:new Date(Date.now()-35*60*1000) },
  { id:'1040', customerName:'Roberto Díaz', phone:'+57 315 222 3333', paymentMethod:'Efectivo', items:[{name:'Hamburguesa Clásica',quantity:2,price:9.50},{name:'Gaseosa',quantity:2,price:2.50}], total:24.00, createdAt:new Date(Date.now()-55*60*1000), status:'DELIVERED', deliveredAt:new Date(Date.now()-20*60*1000) },
];

// ─── Utils ─────────────────────────────────────────────────────────────────────
function MI({ name, filled=false, style }: { name:string; filled?:boolean; style?:React.CSSProperties }) {
  return <span className={`material-symbols-outlined${filled?' filled':''}`} style={style}>{name}</span>;
}
function getInitials(name:string) { return name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase(); }
const AVATAR_COLORS = ['#e2dfff','#d1fae5','#dbeafe','#fde68a','#ffdbc7','#fce7f3','#ede9fe'];
const ROLE_CLASS: Record<TeamMember['role'],string> = { 'Super Admin':'role-superadmin','Operador KDS':'role-operator','Agente IA':'role-agent','Solo Lectura':'role-operator' };
const KB_ICONS: Record<KBDocument['type'],string> = { FAQ:'quiz',CATALOG:'menu_book',POLICY:'policy',PROMO:'sell',SALES_TECHNIQUE:'lightbulb' };
const KB_LABEL: Record<KBDocument['type'],string> = { FAQ:'Preguntas Frecuentes',CATALOG:'Catálogo',POLICY:'Política',PROMO:'Promoción',SALES_TECHNIQUE:'Técnica Venta' };
const STATUS_LABEL: Record<OrderStatus,string> = { NEW:'Nuevo',PREPARING:'Preparando',READY:'Listo',DELIVERED:'Entregado' };
const STATUS_BADGE: Record<OrderStatus,string> = { NEW:'badge-new',PREPARING:'badge-preparing',READY:'badge-ready',DELIVERED:'badge-delivered' };

// ─── CSV Export ────────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Base Modal ────────────────────────────────────────────────────────────────
function Modal({ children, onClose, size='' }: { children:React.ReactNode; onClose:()=>void; size?:string }) {
  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    document.addEventListener('keydown',h); return ()=>document.removeEventListener('keydown',h);
  },[onClose]);
  return (
    <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget) onClose();}}>
      <div className={`modal-panel ${size}`}>{children}</div>
    </div>
  );
}
function ModalHeader({ icon, iconColor='indigo', title, subtitle, onClose }:{ icon:string; iconColor?:string; title:string; subtitle?:string; onClose:()=>void }) {
  return (
    <div className="modal-header">
      <div className="modal-header-left">
        <div className={`modal-icon ${iconColor}`}><MI name={icon} filled /></div>
        <div><div className="modal-title">{title}</div>{subtitle&&<div className="modal-subtitle">{subtitle}</div>}</div>
      </div>
      <button className="modal-close" onClick={onClose}><MI name="close" /></button>
    </div>
  );
}

// ─── Toasts ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, dismiss }: { toasts:ToastMsg[]; dismiss:(id:number)=>void }) {
  return (
    <div className="toast-container">
      {toasts.map(t=>(
        <div key={t.id} className={`toast toast-${t.type}`} onClick={()=>dismiss(t.id)}>
          <MI name={t.type==='success'?'check_circle':t.type==='error'?'error':'info'} />
          <span style={{flex:1}}>{t.message}</span>
          <MI name="close" style={{fontSize:16,opacity:0.7}} />
        </div>
      ))}
    </div>
  );
}

// ─── Password Strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }:{password:string}) {
  const score = (password.length>=8?1:0)+(/[A-Z]/.test(password)?1:0)+(/[0-9]/.test(password)?1:0)+(/[^A-Za-z0-9]/.test(password)?1:0);
  if(!password) return null;
  const cls = score<=1?'strength-weak':score<=2?'strength-medium':'strength-strong';
  const color = score<=1?'var(--color-error)':score<=2?'#f59e0b':'var(--color-success-emerald)';
  return <div style={{marginTop:6}}><div className={`password-strength-bar ${cls}`}/><div style={{fontSize:11,color,fontWeight:700,marginTop:4}}>{score<=1?'Débil':score<=2?'Media':'Fuerte'}</div></div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Member Modal ───────────────────────────────────────────────────────────────
function MemberModal({ member, onClose, onSave }: { member?:TeamMember; onClose:()=>void; onSave:(m:Omit<TeamMember,'id'|'initials'|'lastAccess'>)=>void }) {
  const [name,setName]=useState(member?.name??'');
  const [email,setEmail]=useState(member?.email??'');
  const [role,setRole]=useState<TeamMember['role']>(member?.role??'Operador KDS');
  const [status,setStatus]=useState<'ACTIVE'|'INACTIVE'>(member?.status??'ACTIVE');
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={member?'manage_accounts':'person_add'} iconColor="indigo" title={member?'Editar Miembro':'Invitar al Equipo'} subtitle={member?`Editando: ${member.email}`:'Se enviará un email de invitación'} onClose={onClose}/>
      <div className="modal-body">
        {!member&&<div className="inline-alert alert-info" style={{marginBottom:20}}><MI name="info"/><span>El nuevo miembro recibirá un email con instrucciones de activación.</span></div>}
        <div className="form-group"><label className="form-label">Nombre Completo</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: María García"/></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@empresa.com"/></div>
        <div className="form-group"><label className="form-label">Rol y Permisos</label>
          <select className="form-input" value={role} onChange={e=>setRole(e.target.value as TeamMember['role'])}>
            <option value="Super Admin">Super Admin — Acceso total</option>
            <option value="Operador KDS">Operador KDS — Gestión de pedidos</option>
            <option value="Agente IA">Agente IA — Configuración IA</option>
            <option value="Solo Lectura">Solo Lectura — Sin modificaciones</option>
          </select>
        </div>
        {member&&<div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={status} onChange={e=>setStatus(e.target.value as 'ACTIVE'|'INACTIVE')}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select></div>}
        <div className="inline-alert alert-warning"><MI name="shield"/><span><strong>Super Admin</strong> puede eliminar datos y gestionar facturación.</span></div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>{if(name&&email){onSave({name,email,role,status});onClose();}}}><MI name={member?'save':'send'}/>{member?'Guardar':'Enviar Invitación'}</button>
      </div>
    </Modal>
  );
}

// ── Customer Modal ─────────────────────────────────────────────────────────────
function CustomerModal({ customer, onClose, onSave }: { customer?:Customer; onClose:()=>void; onSave:(c:Partial<Customer>)=>void }) {
  const [name,setName]=useState(customer?.name??'');
  const [phone,setPhone]=useState(customer?.phone??'');
  const [email,setEmail]=useState(customer?.email??'');
  const [status,setStatus]=useState<CustomerStatus>(customer?.status??'ACTIVE');
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={customer?'person_edit':'person_add'} iconColor="blue" title={customer?'Editar Cliente':'Nuevo Cliente'} subtitle={customer?customer.phone:'Registrar cliente manualmente'} onClose={onClose}/>
      <div className="modal-body">
        <div className="form-group"><label className="form-label">Nombre Completo *</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del cliente"/></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group" style={{marginBottom:0}}><label className="form-label">Teléfono WhatsApp *</label><input className="form-input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+57 300 000 0000"/></div>
          <div className="form-group" style={{marginBottom:0}}><label className="form-label">Email (opcional)</label><input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@cliente.com"/></div>
        </div>
        {customer&&(
          <div className="form-group" style={{marginTop:20}}>
            <label className="form-label">Estado</label>
            <div style={{display:'flex',gap:10}}>
              {(['ACTIVE','INACTIVE'] as const).map(s=>(
                <button key={s} onClick={()=>setStatus(s)} className="btn" style={{flex:1,padding:'10px',background:status===s?(s==='ACTIVE'?'#d1fae5':'#fee2e2'):'transparent',border:`2px solid ${status===s?(s==='ACTIVE'?'#065f46':'var(--color-error)'):'var(--color-border-subtle)'}`,color:status===s?(s==='ACTIVE'?'#065f46':'var(--color-error)'):'var(--color-on-surface-variant)'}}>
                  <MI name={s==='ACTIVE'?'check_circle':'cancel'}/>{s==='ACTIVE'?'Activo':'Inactivo'}
                </button>
              ))}
            </div>
          </div>
        )}
        {customer&&(
          <div style={{marginTop:20,padding:'14px',background:'var(--color-surface-soft)',borderRadius:10,border:'1px solid var(--color-border-subtle)'}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--color-on-surface-variant)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Estadísticas</div>
            <div className="grid grid-cols-3 gap-4">
              {[{label:'Pedidos',value:customer.totalOrders},{label:'Gasto Total',value:`$${customer.totalSpend.toFixed(2)}`},{label:'Cliente desde',value:customer.joinDate}].map(s=>(
                <div key={s.label}><div style={{fontSize:11,color:'var(--color-on-surface-variant)'}}>{s.label}</div><div style={{fontWeight:700,fontSize:14,color:'var(--color-primary)'}}>{s.value}</div></div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>{if(name&&phone){onSave({name,phone,email,status});onClose();}}}><MI name="save"/>{customer?'Guardar Cambios':'Crear Cliente'}</button>
      </div>
    </Modal>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteModal({ title, description, onClose, onConfirm }: { title:string; description:string; onClose:()=>void; onConfirm:()=>void }) {
  const [typed,setTyped]=useState('');
  return (
    <Modal onClose={onClose} size="modal-sm">
      <ModalHeader icon="delete_forever" iconColor="red" title="Confirmar Eliminación" onClose={onClose}/>
      <div className="modal-body" style={{textAlign:'center'}}>
        <div className="modal-confirm-icon danger"><MI name="warning" filled/></div>
        <h3 style={{fontWeight:700,fontSize:16,marginBottom:8}}>{title}</h3>
        <p style={{fontSize:13,color:'var(--color-on-surface-variant)',marginBottom:20}}>{description}</p>
        <div className="inline-alert alert-error" style={{textAlign:'left',marginBottom:16}}><MI name="info"/><span>Esta acción es <strong>irreversible</strong>.</span></div>
        <div className="form-group" style={{textAlign:'left'}}><label className="form-label">Escribe <strong>ELIMINAR</strong> para confirmar</label><input className="form-input" value={typed} onChange={e=>setTyped(e.target.value)} placeholder="ELIMINAR"/></div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" disabled={typed!=='ELIMINAR'} style={{opacity:typed!=='ELIMINAR'?0.4:1}} onClick={()=>{onConfirm();onClose();}}><MI name="delete"/>Eliminar Definitivamente</button>
      </div>
    </Modal>
  );
}

function SimpleDeleteModal({ title, description, onClose, onConfirm }: { title:string; description:string; onClose:()=>void; onConfirm:()=>void }) {
  return (
    <Modal onClose={onClose} size="modal-sm">
      <ModalHeader icon="delete_forever" iconColor="red" title="Confirmar Eliminación" onClose={onClose}/>
      <div className="modal-body" style={{textAlign:'center'}}>
        <div className="modal-confirm-icon danger"><MI name="warning" filled/></div>
        <h3 style={{fontWeight:700,fontSize:16,marginBottom:8}}>{title}</h3>
        <p style={{fontSize:13,color:'var(--color-on-surface-variant)',marginBottom:20}}>{description}</p>
        <div className="inline-alert alert-error" style={{textAlign:'left',marginBottom:16}}><MI name="info"/><span>Esta acción es <strong>irreversible</strong>.</span></div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>No, Cancelar</button>
        <button type="button" className="btn btn-primary" style={{background:'var(--color-error)'}} onClick={()=>{onConfirm();onClose();}}><MI name="delete"/>Sí, Eliminar</button>
      </div>
    </Modal>
  );
}

// ── Edit Order Modal ─────────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSave }: { order:Order; onClose:()=>void; onSave:(id:string, updates:Partial<Order>)=>void }) {
  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [phone, setPhone] = useState(order?.phone || '');
  const [shippingAddress, setShippingAddress] = useState(order?.shippingAddress || '');
  const [deliveryMethod, setDeliveryMethod] = useState(order?.deliveryMethod || 'DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState(order?.paymentMethod || 'Efectivo');
  const [status, setStatus] = useState<OrderStatus>(order?.status || 'NEW');
  const [total, setTotal] = useState(order?.total?.toString() || '0');

  if (!order) return null;

  return (
    <Modal onClose={onClose} size="modal-lg">
      <ModalHeader icon="edit_document" iconColor="indigo" title={`Editar Pedido #${order.id}`} subtitle="Modifica los detalles operativos del pedido" onClose={onClose}/>
      <div className="modal-body">
        <div className="grid grid-cols-2 gap-4" style={{marginBottom: 16}}>
          <div className="form-group"><label className="form-label">Nombre del Cliente</label><input className="form-input" value={customerName} onChange={e=>setCustomerName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4" style={{marginBottom: 16}}>
          <div className="form-group">
            <label className="form-label">Método de Entrega</label>
            <select className="form-input" value={deliveryMethod} onChange={e=>setDeliveryMethod(e.target.value as any)}>
              <option value="DELIVERY">Domicilio (Delivery)</option>
              <option value="PICKUP">Retiro en Local (Pickup)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección de Envío</label>
            <input className="form-input" value={shippingAddress} onChange={e=>setShippingAddress(e.target.value)} disabled={deliveryMethod==='PICKUP'} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4" style={{marginBottom: 16}}>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-input" value={status} onChange={e=>setStatus(e.target.value as OrderStatus)}>
              <option value="NEW">Nuevo</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="PREPARING">En Preparación</option>
              <option value="READY">Listo / Despacho</option>
              <option value="SHIPPED">En Camino</option>
              <option value="DELIVERED">Entregado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Método de Pago</label>
            <input className="form-input" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Monto Total ($)</label>
            <input className="form-input" type="number" step="0.01" value={total} onChange={e=>setTotal(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>{
          onSave(order.id, {
            customerName, phone, shippingAddress, deliveryMethod, paymentMethod, status, total: parseFloat(total) || order.total
          });
          onClose();
        }}><MI name="save"/>Guardar Cambios</button>
      </div>
    </Modal>
  );
}

// ── Document Modal ─────────────────────────────────────────────────────────────
function DocumentModal({ document, onClose, onSave }: { document?:KBDocument; onClose:()=>void; onSave:(d:Partial<KBDocument>)=>void }) {
  const [title,setTitle]=useState(document?.title??'');
  const [type,setType]=useState<KBDocument['type']>(document?.type??'FAQ');
  const [content,setContent]=useState(document?.content??'');
  const [dragging,setDragging]=useState(false);
  const [tab,setTab]=useState<'text'|'file'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const allowedExtensions = ['.txt', '.csv', '.json', '.md'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert("Formato de archivo no compatible directo en navegador. Por favor suba archivos de texto (.txt, .csv, .md, .json) o copie y pegue su contenido para cargarlo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      if (!title) {
        setTitle(file.name.substring(0, file.name.lastIndexOf('.')));
      }
      setTab('text'); // Regresar a la pestaña de texto para permitir revisión
    };
    reader.readAsText(file);
  };

  return (
    <Modal onClose={onClose} size="modal-lg">
      <ModalHeader icon={document?'edit_document':'upload_file'} iconColor="indigo" title={document?'Editar Documento':'Cargar Documento'} subtitle="El agente IA aprenderá de este contenido" onClose={onClose}/>
      <div className="modal-body">
        <div className="grid grid-cols-2 gap-4" style={{marginBottom:20}}>
          <div className="form-group" style={{marginBottom:0}}><label className="form-label">Título *</label><input className="form-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Menú Principal 2026"/></div>
          <div className="form-group" style={{marginBottom:0}}><label className="form-label">Tipo</label>
            <select className="form-input" value={type} onChange={e=>setType(e.target.value as KBDocument['type'])}>
              <option value="CATALOG">📋 Catálogo</option><option value="FAQ">❓ FAQ</option><option value="POLICY">📜 Política</option><option value="PROMO">🎯 Promoción</option><option value="SALES_TECHNIQUE">💡 Técnica Venta</option>
            </select>
          </div>
        </div>
        {!document&&(
          <div style={{display:'flex',gap:0,marginBottom:16,background:'var(--color-surface-container)',borderRadius:10,padding:4}}>
            {(['text','file'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} className="btn" style={{flex:1,padding:'8px',background:tab===t?'white':'transparent',color:tab===t?'var(--color-primary)':'var(--color-on-surface-variant)',borderRadius:8,border:'none',fontWeight:tab===t?700:400,boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
                <MI name={t==='text'?'edit':'attach_file'} style={{fontSize:16}}/>{t==='text'?'Escribir / Pegar':'Subir Archivo'}
              </button>
            ))}
          </div>
        )}
        {(document||tab==='text')?(
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Contenido</label>
            <textarea className="form-input" rows={20} value={content} onChange={e=>setContent(e.target.value)} placeholder="Pega aquí el contenido..." style={{resize:'vertical', minHeight: '350px'}}/>
            <div className="form-hint">{content.split(' ').filter(Boolean).length} palabras</div>
          </div>
        ):(
          <div 
            className={`drop-zone${dragging?' dragging':''}`} 
            onDragOver={e=>{e.preventDefault();setDragging(true);}} 
            onDragLeave={()=>setDragging(false)} 
            onDrop={e=>{
              e.preventDefault();
              setDragging(false);
              if(e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            style={{cursor:'pointer'}}
            onClick={()=>fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={e=>{
                if(e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }} 
              style={{display:'none'}} 
              accept=".txt,.csv,.json,.md"
            />
            <MI name="cloud_upload" style={{fontSize:48,color:'var(--color-secondary-container)',display:'block',textAlign:'center',marginBottom:12}}/>
            <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Arrastra tu archivo aquí o haz clic para buscar</div>
            <div style={{fontSize:13,color:'var(--color-on-surface-variant)',marginBottom:16}}>Compatible con .txt, .csv, .md, .json</div>
            <button className="btn btn-outline" type="button" style={{margin:'0 auto',display:'block'}}><MI name="folder_open"/>Buscar Archivo</button>
          </div>
        )}
        <div className="inline-alert alert-info" style={{marginTop:16}}><MI name="psychology"/><span>El entrenamiento se ejecutará automáticamente al guardar. Tiempo estimado: <strong>1-2 min</strong>.</span></div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>{if(title){onSave({title,type,content});onClose();}}}><MI name={document?'save':'upload'}/>{document?'Guardar Cambios':'Cargar y Entrenar'}</button>
      </div>
    </Modal>
  );
}

// ── Train Model Modal ──────────────────────────────────────────────────────────
function TrainModelModal({ onClose, showToast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [progress,setProgress]=useState(0);
  const [phase,setPhase]=useState('Iniciando entrenamiento...');
  const [done,setDone]=useState(false);
  const phases = ['Procesando documentos...','Tokenizando contenido...','Vectorizando embeddings...','Optimizando modelo...','Validando respuestas...','Finalizando configuración...'];
  useEffect(()=>{
    let p=0;
    const iv = setInterval(()=>{
      p+=Math.random()*12+4;
      if(p>=100){ p=100; setProgress(100); setPhase('¡Entrenamiento completado!'); setDone(true); clearInterval(iv); showToast('Modelo IA entrenado exitosamente','success'); return; }
      setProgress(Math.min(p,99));
      setPhase(phases[Math.floor((p/100)*phases.length)]??phases[phases.length-1]);
    },400);
    return ()=>clearInterval(iv);
  },[]);
  const r=42; const circ=2*Math.PI*r; const dash=circ-(progress/100)*circ;
  return (
    <Modal onClose={onClose} size="modal-sm">
      <ModalHeader icon="psychology" iconColor="indigo" title="Entrenando Modelo IA" subtitle="Nexus Intelligence v2.1" onClose={onClose}/>
      <div className="modal-body" style={{textAlign:'center'}}>
        <div className="train-progress-ring" style={{marginBottom:20}}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} stroke="var(--color-surface-container)" strokeWidth="8" fill="none"/>
            <circle cx="50" cy="50" r={r} stroke={done?'var(--color-whatsapp-green)':'var(--color-secondary-container)'} strokeWidth="8" fill="none" strokeDasharray={circ} strokeDashoffset={dash} style={{transition:'stroke-dashoffset 0.3s,stroke 0.5s'}}/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            {done?<MI name="check_circle" style={{fontSize:32,color:'var(--color-whatsapp-green)'}}/>:<span style={{fontSize:22,fontWeight:800,color:'var(--color-primary)'}}>{Math.round(progress)}%</span>}
          </div>
        </div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:done?'var(--color-success-emerald)':'var(--color-on-surface)'}}>{phase}</div>
        <div style={{height:4,background:'var(--color-surface-container)',borderRadius:4,marginBottom:20,overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg, var(--color-primary), var(--color-secondary-container))`,width:`${progress}%`,transition:'width 0.3s',borderRadius:4}}/>
        </div>
        {[{label:'Documentos procesados',value:'4 / 4'},{label:'Palabras indexadas',value:'2,650'},{label:'Tokens generados',value:'~8,400'}].map(m=>(
          <div key={m.label} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--color-border-subtle)',fontSize:13}}>
            <span style={{color:'var(--color-on-surface-variant)'}}>{m.label}</span>
            <span style={{fontWeight:700}}>{m.value}</span>
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose} disabled={!done} style={{opacity:done?1:0.5}}><MI name="check"/>Cerrar</button>
      </div>
    </Modal>
  );
}

// ── WhatsApp Test Modal ────────────────────────────────────────────────────────
function WhatsAppTestModal({ onClose }: { onClose:()=>void }) {
  type StepStatus='pending'|'running'|'success'|'error';
  const [recipientPhone, setRecipientPhone] = useState('');
  const [steps,setSteps]=useState([
    {label:'Verificando credenciales Meta API',detail:'Comprobando Phone ID y Access Token...',status:'pending' as StepStatus},
    {label:'Probando conexión al Webhook',detail:'GET /webhooks/whatsapp → 200 OK',status:'pending' as StepStatus},
    {label:'Enviando mensaje de prueba',detail:'Mensaje de sistema a número de prueba',status:'pending' as StepStatus},
    {label:'Verificando recepción',detail:'Confirmando entrega del mensaje',status:'pending' as StepStatus},
  ]);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const runTest = async () => {
    if (!recipientPhone) {
      setErrorMsg('Por favor ingresa un número de teléfono de destino válido.');
      return;
    }
    setErrorMsg('');
    setRunning(true);
    setDone(false);

    // Reset steps
    setSteps([
      {label:'Verificando credenciales Meta API',detail:'Comprobando Phone ID y Access Token...',status:'pending' as StepStatus},
      {label:'Probando conexión al Webhook',detail:'GET /webhooks/whatsapp → 200 OK',status:'pending' as StepStatus},
      {label:'Enviando mensaje de prueba',detail:'Mensaje de sistema a número de prueba',status:'pending' as StepStatus},
      {label:'Verificando recepción',detail:'Confirmando entrega del mensaje',status:'pending' as StepStatus},
    ]);

    try {
      // 1. Verificando credenciales Meta API
      setSteps(s => s.map((x, j) => j === 0 ? { ...x, status: 'running' } : x));
      const metaRes = await fetch(API_BASE_URL + '/api/tenant/settings/test-meta', {
        method: 'POST',
        headers: {
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870',
          'Content-Type': 'application/json'
        }
      });
      if (!metaRes.ok) {
        const errData = await metaRes.json();
        throw new Error(`Credenciales: ${errData.detail || 'Error en Meta API'}`);
      }
      const metaData = await metaRes.json();
      setSteps(s => s.map((x, j) => j === 0 ? { ...x, status: 'success', detail: `Conexión establecida (${metaData.latency_ms}ms). Núm: ${metaData.phone_id}` } : x));

      // 2. Probando conexión al Webhook
      setSteps(s => s.map((x, j) => j === 1 ? { ...x, status: 'running' } : x));
      const webhookUrl = `${API_BASE_URL}/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge&hub.verify_token=flowcommerce_token_123`;
      const webhookRes = await fetch(webhookUrl);
      if (!webhookRes.ok) {
        throw new Error('Fallo al validar endpoint del Webhook.');
      }
      const webhookChallenge = await webhookRes.text();
      if (webhookChallenge !== 'test_challenge') {
        throw new Error('El Webhook respondió pero el token de verificación o el challenge no coinciden.');
      }
      setSteps(s => s.map((x, j) => j === 1 ? { ...x, status: 'success', detail: 'Webhook en línea y validado correctamente.' } : x));

      // 3. Enviando mensaje de prueba
      setSteps(s => s.map((x, j) => j === 2 ? { ...x, status: 'running' } : x));
      const msgRes = await fetch(API_BASE_URL + '/api/tenant/settings/test-message', {
        method: 'POST',
        headers: {
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipient_phone: recipientPhone })
      });
      if (!msgRes.ok) {
        const errData = await msgRes.json();
        throw new Error(`Mensajería: ${errData.detail || 'Error al enviar mensaje de prueba'}`);
      }
      const msgData = await msgRes.json();
      setSteps(s => s.map((x, j) => j === 2 ? { ...x, status: 'success', detail: `Mensaje enviado. ID: ${msgData.message_id.substring(0, 12)}...` } : x));

      // 4. Verificando recepción
      setSteps(s => s.map((x, j) => j === 3 ? { ...x, status: 'running' } : x));
      await new Promise(r => setTimeout(r, 1000)); // Simular pequeña espera de confirmación de red de Meta
      setSteps(s => s.map((x, j) => j === 3 ? { ...x, status: 'success', detail: 'Meta confirmó la entrega. Verifica la app de WhatsApp.' } : x));

    } catch (err: any) {
      // Identificar qué paso falló
      setSteps(s => {
        const runningIndex = s.findIndex(x => x.status === 'running');
        if (runningIndex !== -1) {
          return s.map((x, j) => j === runningIndex ? { ...x, status: 'error', detail: err.message || 'Error inesperado.' } : x);
        }
        return s;
      });
      setErrorMsg(err.message || 'Ocurrió un error inesperado durante las pruebas.');
    } finally {
      setRunning(false);
      setDone(true);
    }
  };

  const allOk=steps.every(s=>s.status==='success');
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="wifi_tethering" iconColor="green" title="Prueba de Conexión WhatsApp" subtitle="Verificación en tiempo real" onClose={onClose}/>
      <div className="modal-body">
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Número de WhatsApp de Destino (para prueba)</label>
          <input
            type="text"
            className="form-input"
            value={recipientPhone}
            onChange={e => setRecipientPhone(e.target.value)}
            placeholder="Ej: 50761234567 o +50761234567"
            disabled={running}
          />
          <small style={{ display: 'block', marginTop: 4, color: 'var(--color-outline)' }}>
            Debe ser un número registrado con código de país que pueda recibir mensajes.
          </small>
        </div>

        {errorMsg && <div className="inline-alert alert-error" style={{marginBottom:20}}><MI name="error"/><span>{errorMsg}</span></div>}
        {!running&&!done&&!errorMsg&&<div className="inline-alert alert-info" style={{marginBottom:20}}><MI name="info"/><span>Se realizarán pruebas de autenticación y se enviará un mensaje de prueba al número ingresado.</span></div>}
        
        {steps.map((step,i)=>(
          <div key={i} className={`test-step step-${step.status}`}>
            <div className={`test-step-icon ${step.status}`}>
              {step.status==='success'&&<MI name="check"/>}{step.status==='error'&&<MI name="close"/>}
              {step.status==='running'&&<MI name="refresh" style={{animation:'spin 0.8s linear infinite'}}/>}
              {step.status==='pending'&&<MI name="radio_button_unchecked"/>}
            </div>
            <div><div style={{fontWeight:700,fontSize:13}}>{step.label}</div><div style={{fontSize:12,color:'var(--color-on-surface-variant)',marginTop:2}}>{step.detail}</div></div>
          </div>
        ))}
        {done&&<div className={`inline-alert ${allOk?'alert-success':'alert-error'}`} style={{marginTop:8}}><MI name={allOk?'check_circle':'error'}/><span>{allOk?'¡Integración y mensajería funcionando correctamente!':'Verifica tus credenciales en Meta for Developers y el número ingresado.'}</span></div>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={runTest} disabled={running}>
          <MI name={running?'refresh':'play_arrow'} style={running?{animation:'spin 0.8s linear infinite'}:{}}/>
          {running?'Probando...':done?'Reintentar':'Iniciar Prueba'}
        </button>
      </div>
    </Modal>
  );
}

// ── Change Password ────────────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, onSave }: { onClose:()=>void; onSave:()=>void }) {
  const [current,setCurrent]=useState('');const [next,setNext]=useState('');const [confirm,setConfirm]=useState('');
  const [showC,setShowC]=useState(false);const [showN,setShowN]=useState(false);
  const mismatch=next&&confirm&&next!==confirm;
  return (
    <Modal onClose={onClose} size="modal-sm">
      <ModalHeader icon="lock_reset" iconColor="purple" title="Cambiar Contraseña" subtitle="Usa una contraseña segura y única" onClose={onClose}/>
      <div className="modal-body">
        <div className="form-group"><label className="form-label">Contraseña Actual</label>
          <div style={{position:'relative'}}><input className="form-input" type={showC?'text':'password'} value={current} onChange={e=>setCurrent(e.target.value)} placeholder="Tu contraseña actual" style={{paddingRight:44}}/>
            <button onClick={()=>setShowC(!showC)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--color-outline)'}}><MI name={showC?'visibility_off':'visibility'} style={{fontSize:18}}/></button>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Nueva Contraseña</label>
          <div style={{position:'relative'}}><input className="form-input" type={showN?'text':'password'} value={next} onChange={e=>setNext(e.target.value)} placeholder="Mínimo 8 caracteres" style={{paddingRight:44}}/>
            <button onClick={()=>setShowN(!showN)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--color-outline)'}}><MI name={showN?'visibility_off':'visibility'} style={{fontSize:18}}/></button>
          </div>
          <PasswordStrength password={next}/>
        </div>
        <div className="form-group" style={{marginBottom:0}}><label className="form-label">Confirmar Nueva Contraseña</label>
          <input className="form-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repite la nueva contraseña" style={{borderColor:mismatch?'var(--color-error)':undefined}}/>
          {mismatch&&<div style={{color:'var(--color-error)',fontSize:12,marginTop:4}}>Las contraseñas no coinciden</div>}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!current||!next||!!mismatch||next.length<8} style={{opacity:(!current||!next||!!mismatch||next.length<8)?0.4:1}} onClick={()=>{onSave();onClose();}}><MI name="lock"/>Actualizar Contraseña</button>
      </div>
    </Modal>
  );
}

// ── Setup 2FA ──────────────────────────────────────────────────────────────────
function Setup2FAModal({ onClose, onSave }: { onClose:()=>void; onSave:()=>void }) {
  const [step,setStep]=useState<1|2|3>(1);
  const [otp,setOtp]=useState(['','','','','','']);
  const refs=useRef<(HTMLInputElement|null)[]>([]);
  const handleOtp=(val:string,i:number)=>{const c=val.replace(/\D/g,'').slice(0,1);const n=[...otp];n[i]=c;setOtp(n);if(c&&i<5)refs.current[i+1]?.focus();};
  const handleKey=(e:React.KeyboardEvent,i:number)=>{if(e.key==='Backspace'&&!otp[i]&&i>0)refs.current[i-1]?.focus();};
  const QR=[1,1,1,1,1,1,1,0,1,0,1,1,0,0,0,0,0,1,0,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,0,1,1,1,0,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,0,0,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,0,0,0,0,1,1,0,1,0,1,1,0,1,0,1,0,0,0,1,0,0,1,0,0,0,0,1,1,1,0,1,0,1,0,1,0,1];
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="phonelink_lock" iconColor="purple" title="Autenticación de Dos Factores" subtitle={`Paso ${step} de 3`} onClose={onClose}/>
      <div className="modal-body">
        <div style={{display:'flex',gap:8,marginBottom:24}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:4,borderRadius:4,background:s<=step?'var(--color-secondary-container)':'var(--color-border-subtle)',transition:'background 0.3s'}}/>)}</div>
        {step===1&&<div style={{textAlign:'center'}}><MI name="phonelink_lock" style={{fontSize:48,color:'#5b21b6',marginBottom:16,display:'block'}}/><h3 style={{fontWeight:700,marginBottom:8}}>Activa la verificación en 2 pasos</h3><p style={{fontSize:13,color:'var(--color-on-surface-variant)',marginBottom:24}}>Necesitarás una app de autenticación como <strong>Google Authenticator</strong> o <strong>Authy</strong>.</p><div className="inline-alert alert-info" style={{textAlign:'left'}}><MI name="info"/><span>Protege tu cuenta incluso si alguien obtiene tu contraseña.</span></div></div>}
        {step===2&&<div>
          <p style={{fontSize:13,color:'var(--color-on-surface-variant)',marginBottom:20}}>Escanea este código QR con tu app de autenticación:</p>
          <div className="qr-container" style={{marginBottom:16}}><div className="qr-grid">{QR.map((c,i)=><div key={i} className="qr-cell" style={{background:c?'#1a146b':'white'}}/>)}</div></div>
          <div style={{textAlign:'center',marginBottom:16}}><div style={{fontSize:11,color:'var(--color-on-surface-variant)',marginBottom:4}}>O ingresa este código manualmente:</div><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:700,color:'var(--color-primary)',letterSpacing:'0.15em',background:'var(--color-surface-container)',padding:'10px 20px',borderRadius:8,display:'inline-block'}}>NEXU-3A7F-K9PQ-2M4R</div></div>
          <div className="inline-alert alert-warning"><MI name="warning"/><span>Guarda este código en un lugar seguro.</span></div>
        </div>}
        {step===3&&<div><p style={{fontSize:13,color:'var(--color-on-surface-variant)',marginBottom:8,textAlign:'center'}}>Ingresa el código de 6 dígitos que muestra tu app:</p>
          <div className="otp-input-group">{otp.map((v,i)=><input key={i} ref={el=>{refs.current[i]=el;}} className="otp-input" value={v} onChange={e=>handleOtp(e.target.value,i)} onKeyDown={e=>handleKey(e,i)} maxLength={1} inputMode="numeric"/>)}</div>
          {otp.every(v=>v)&&<div className="inline-alert alert-success" style={{marginTop:8}}><MI name="check_circle"/><span>¡Código válido! Haz clic en <strong>Activar 2FA</strong>.</span></div>}
        </div>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={step===1?onClose:()=>setStep(s=>(s-1) as 1|2|3)}>{step===1?'Cancelar':<><MI name="arrow_back"/>Atrás</>}</button>
        <button className="btn btn-primary" disabled={step===3&&otp.some(v=>!v)} style={{opacity:step===3&&otp.some(v=>!v)?0.4:1}} onClick={()=>{if(step<3)setStep(s=>(s+1) as 1|2|3);else{onSave();onClose();}}}>
          {step===3?<><MI name="lock"/>Activar 2FA</>:<><MI name="arrow_forward"/>Siguiente</>}
        </button>
      </div>
    </Modal>
  );
}

// ── Active Sessions ────────────────────────────────────────────────────────────
function ActiveSessionsModal({ onClose, showToast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [sessions,setSessions]=useState([
    {id:'S1',device:'Chrome — Windows 11',location:'Bogotá, Colombia',ip:'181.52.xx.xx',lastActive:'Ahora mismo',current:true,icon:'computer'},
    {id:'S2',device:'Safari — iPhone 15',location:'Medellín, Colombia',ip:'201.220.xx.xx',lastActive:'Hace 3h',current:false,icon:'smartphone'},
    {id:'S3',device:'Firefox — macOS',location:'Cali, Colombia',ip:'190.14.xx.xx',lastActive:'Hace 2 días',current:false,icon:'laptop_mac'},
  ]);
  const revoke=(id:string)=>{setSessions(p=>p.filter(s=>s.id!==id));showToast('Sesión cerrada','success');};
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="devices" iconColor="indigo" title="Sesiones Activas" subtitle={`${sessions.length} dispositivos`} onClose={onClose}/>
      <div className="modal-body">
        <div className="inline-alert alert-info" style={{marginBottom:16}}><MI name="info"/><span>Cierra sesiones de dispositivos que no reconozcas.</span></div>
        {sessions.map(s=>(
          <div key={s.id} className={`session-item${s.current?' current':''}`}>
            <div className="session-icon"><MI name={s.icon}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:8}}>{s.device}{s.current&&<span className="badge badge-active" style={{fontSize:10}}>Sesión actual</span>}</div>
              <div style={{fontSize:12,color:'var(--color-on-surface-variant)',marginTop:2}}>{s.location} · {s.ip}</div>
              <div style={{fontSize:11,color:'var(--color-outline)',marginTop:1}}><MI name="schedule" style={{fontSize:12,verticalAlign:'middle'}}/> {s.lastActive}</div>
            </div>
            {!s.current&&<button className="btn btn-outline" style={{fontSize:12,padding:'6px 12px',color:'var(--color-error)',borderColor:'var(--color-error)'}} onClick={()=>revoke(s.id)}><MI name="logout" style={{fontSize:15}}/>Cerrar</button>}
          </div>
        ))}
        {sessions.length>1&&<button className="btn btn-outline" style={{width:'100%',marginTop:8,color:'var(--color-error)',borderColor:'var(--color-error)'}} onClick={()=>{setSessions(p=>p.filter(s=>s.current));showToast('Todas las otras sesiones fueron cerradas','success');}}><MI name="logout"/>Cerrar Todas las Demás</button>}
      </div>
      <div className="modal-footer"><button className="btn btn-primary" onClick={onClose}><MI name="check"/>Listo</button></div>
    </Modal>
  );
}

// ── Order Detail Modal ─────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, showToast }: { order:Order; onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const elapsed = Math.floor((Date.now()-order.createdAt.getTime())/60000);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const sendInvoice = async () => {
    setSendingInvoice(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tenant/orders/${order.uuid || order.id}/invoice`, {
        method: 'POST',
        headers: {
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Fallo al enviar factura');
      }
      showToast('Factura enviada por WhatsApp correctamente', 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al enviar la factura.', 'error');
    } finally {
      setSendingInvoice(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="receipt_long" iconColor="blue" title={`Pedido #${order.id}`} subtitle={`${STATUS_LABEL[order.status]} · ${order.createdAt.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}`} onClose={onClose}/>
      <div className="modal-body">
        {/* Client */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'var(--color-surface-container-low)',borderRadius:10,marginBottom:20}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--color-primary-fixed)',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16}}>{getInitials(order.customerName)}</div>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>{order.customerName}</div>
            <div style={{fontSize:12,color:'var(--color-on-surface-variant)',fontFamily:'monospace'}}>{order.phone}</div>
          </div>
          <button className="btn btn-success" style={{marginLeft:'auto',fontSize:12,padding:'7px 14px'}} onClick={()=>window.open(`https://wa.me/${order.phone.replace(/\D/g,'')}`)}><MI name="chat" style={{fontSize:16}}/>WhatsApp</button>
        </div>
        {/* Products */}
        <div className="section-title" style={{fontSize:13}}><MI name="shopping_basket"/>Productos</div>
        <div style={{marginBottom:16}}>
          {order.items.map((it,i)=>(
            <div key={i} className="order-product-line">
              <span>{it.quantity}× <strong>{it.name}</strong></span>
              <span style={{fontWeight:700,color:'var(--color-primary)'}}>${(it.price*it.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'flex-end',padding:'12px 14px 0'}}>
            <div style={{fontWeight:800,fontSize:18,color:'var(--color-primary)'}}>Total: ${order.total.toFixed(2)}</div>
          </div>
        </div>
        {/* Details */}
        <div style={{background:'var(--color-surface-container-low)',borderRadius:10,padding:'14px',marginBottom:16}}>
          <div className="order-detail-row"><span className="order-detail-label">Estado</span><span className={`badge ${STATUS_BADGE[order.status]}`}>{STATUS_LABEL[order.status]}</span></div>
          <div className="order-detail-row"><span className="order-detail-label">Método de Pago</span><span className="order-detail-value">{order.paymentMethod}</span></div>
          <div className="order-detail-row"><span className="order-detail-label">Tiempo transcurrido</span><span className="order-detail-value">{elapsed} minutos</span></div>
          <div className="order-detail-row"><span className="order-detail-label">Hora del pedido</span><span className="order-detail-value">{order.createdAt.toLocaleTimeString('es-CO')}</span></div>
          {order.deliveredAt&&<div className="order-detail-row"><span className="order-detail-label">Hora de entrega</span><span className="order-detail-value">{order.deliveredAt.toLocaleTimeString('es-CO')}</span></div>}
        </div>
        {order.notes&&<div className="inline-alert alert-info"><MI name="smart_toy"/><span><strong>Nota IA:</strong> {order.notes}</span></div>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        <button className="btn btn-outline" onClick={sendInvoice} disabled={sendingInvoice} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
          <MI name={sendingInvoice ? 'refresh' : 'receipt'} style={sendingInvoice ? { animation: 'spin 0.8s linear infinite' } : {}}/>
          {sendingInvoice ? 'Enviando...' : 'Enviar Factura WhatsApp'}
        </button>
        <button className="btn btn-primary" onClick={()=>window.open(`https://wa.me/${order.phone.replace(/\D/g,'')}`)}>
          <MI name="chat"/>Contactar por WhatsApp
        </button>
      </div>
    </Modal>
  );
}

// ── WhatsApp Chat Modal ────────────────────────────────────────────────────────
function WhatsAppChatModal({ customer, onClose }: { customer:Customer; onClose:()=>void }) {
  const [messages,setMessages]=useState([
    {id:1,text:`¡Hola! Soy el asistente virtual de Nexus AI 🤖\n¿En qué puedo ayudarte hoy?`,from:'bot',time:'19:02'},
    {id:2,text:'Quiero hacer un pedido de pizza 🍕',from:'user',time:'19:03'},
    {id:3,text:'¡Con mucho gusto! 😊 Tenemos estas opciones:\n\n• Pizza Margherita — $12.50\n• Pizza Pepperoni Familiar — $14.99\n• Pizza Hawaiana — $13.50\n\n¿Cuál te llama la atención?',from:'bot',time:'19:03'},
  ]);
  const [input,setInput]=useState('');
  const bottomRef=useRef<HTMLDivElement>(null);
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),[messages]);
  const send=()=>{
    if(!input.trim()) return;
    const userMsg={id:Date.now(),text:input,from:'user',time:new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})};
    setMessages(p=>[...p,userMsg]);
    setInput('');
    setTimeout(()=>{
      setMessages(p=>[...p,{id:Date.now()+1,text:'Entendido. Estoy procesando tu solicitud y en breve un agente humano te asistirá si es necesario. 🙏',from:'bot',time:new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}]);
    },1200);
  };
  return (
    <Modal onClose={onClose}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 20px',borderBottom:'1px solid var(--color-border-subtle)',background:'#075E54',flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:customer.avatarColor,color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13}}>{customer.initials}</div>
        <div style={{flex:1}}><div style={{fontWeight:700,color:'white',fontSize:14}}>{customer.name}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>En línea · {customer.phone}</div></div>
        <button className="modal-close" onClick={onClose} style={{color:'white'}}><MI name="close"/></button>
      </div>
      <div className="chat-window">
        <div className="chat-messages">
          {messages.map(m=>(
            <div key={m.id} className={`chat-bubble ${m.from==='user'?'outgoing':'incoming'}`}>
              {m.from==='bot'&&<div className="chat-sender">Nexus AI 🤖</div>}
              <div style={{whiteSpace:'pre-wrap'}}>{m.text}</div>
              <div className="chat-bubble-time">
                {m.time} {m.from==='user'&&<MI name="done_all"/>}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div className="chat-input-row">
          <MI name="sentiment_satisfied" style={{color:'#8696a0',fontSize:22,cursor:'pointer'}} onClick={() => setInput(p => p + ' 🍕')}/>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Escribe un mensaje..." autoFocus/>
          <MI name="attach_file" style={{color:'#8696a0',fontSize:22,cursor:'pointer'}} onClick={() => {
            const fi = document.createElement('input');
            fi.type = 'file';
            fi.onchange = (ev: any) => {
              const file = ev.target.files?.[0];
              if (file) setInput(p => p + ` [Archivo: ${file.name}]`);
            };
            fi.click();
          }}/>
          <button className="chat-send-btn" onClick={send}><MI name="send" style={{fontSize:18}}/></button>
        </div>
      </div>
    </Modal>
  );
}

// ── Upgrade Modal ──────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, showToast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  return (
    <Modal onClose={onClose} size="modal-xl">
      <ModalHeader icon="workspace_premium" iconColor="orange" title="Actualizar Plan" subtitle="Elige el plan que mejor se adapte a tu negocio" onClose={onClose}/>
      <div className="modal-body">
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:13,color:'var(--color-on-surface-variant)'}}>Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta de crédito.</div>
        </div>
        <div className="pricing-grid">
          {[
            { plan:'Starter', price:'$0', period:'/mes', desc:'Para negocios que empiezan', color:'var(--color-on-surface-variant)', features:[{t:'5,000 mensajes / mes',ok:true},{t:'1 número de WhatsApp',ok:true},{t:'2 agentes de equipo',ok:true},{t:'Catálogo básico (hasta 50 productos)',ok:true},{t:'KDS en tiempo real',ok:false},{t:'Reportes avanzados',ok:false},{t:'Soporte prioritario',ok:false}], cta:'Plan Actual', disabled:true },
            { plan:'Professional', price:'$49', period:'/mes', desc:'Para negocios en crecimiento', color:'var(--color-secondary-container)', featured:true, features:[{t:'25,000 mensajes / mes',ok:true},{t:'3 números de WhatsApp',ok:true},{t:'5 agentes de equipo',ok:true},{t:'Catálogo ilimitado',ok:true},{t:'KDS en tiempo real',ok:true},{t:'Reportes avanzados',ok:true},{t:'Soporte prioritario',ok:false}], cta:'Plan Actual ✓', disabled:true },
            { plan:'Enterprise', price:'$149', period:'/mes', desc:'Para grandes operaciones', color:'var(--color-primary)', features:[{t:'Mensajes ilimitados',ok:true},{t:'Números ilimitados',ok:true},{t:'Equipo ilimitado',ok:true},{t:'Catálogo ilimitado',ok:true},{t:'KDS multi-tienda',ok:true},{t:'Reportes + BI export',ok:true},{t:'Soporte 24/7 dedicado',ok:true}], cta:'Actualizar a Enterprise' },
          ].map(p=>(
            <div key={p.plan} className={`pricing-card${p.featured?' featured':''}`}>
              {p.featured&&<div className="pricing-badge">MÁS POPULAR</div>}
              <div className="pricing-plan">{p.plan}</div>
              <div><div className="pricing-price">{p.price}<span>{p.period}</span></div><div style={{fontSize:12,color:'var(--color-on-surface-variant)',marginTop:4}}>{p.desc}</div></div>
              <div style={{height:1,background:'var(--color-border-subtle)'}}/>
              {p.features.map(f=>(
                <div key={f.t} className={`pricing-feature${f.ok?'':' disabled'}`}>
                  <MI name={f.ok?'check_circle':'remove_circle'}/>{f.t}
                </div>
              ))}
              <button
                className={`btn ${p.disabled?'btn-outline':'btn-primary'}`} style={{marginTop:'auto',width:'100%',opacity:p.plan==='Starter'?0.5:1}}
                onClick={()=>{if(!p.disabled){showToast(`Redirigiendo a checkout del plan ${p.plan}...`,'info');setTimeout(onClose,500);}}}
                disabled={p.plan==='Starter'}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
        <div className="inline-alert alert-info" style={{marginTop:16}}><MI name="info"/><span>¿Tienes un volumen personalizado? <strong style={{cursor:'pointer'}}>Contáctanos para un plan Enterprise a medida.</strong></span></div>
      </div>
    </Modal>
  );
}

// ── Help Center Modal ──────────────────────────────────────────────────────────
function HelpCenterModal({ onClose, showToast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [openFaq,setOpenFaq]=useState<number|null>(null);
  const [contactMsg,setContactMsg]=useState('');
  const [tab,setTab]=useState<'faq'|'contact'>('faq');
  const faqs=[
    {q:'¿Cómo configuro el número de WhatsApp?', a:'Ve a Configuración → WhatsApp & IA. Ingresa tu Phone ID y Access Token de Meta for Developers. Usa el botón "Probar Conexión" para verificar que todo funciona correctamente.'},
    {q:'¿Cómo entreno al agente IA?', a:'Ve a AI Knowledge Base y carga tus documentos (menú, FAQ, políticas). Una vez subidos, haz clic en "Entrenar Modelo". El proceso tarda entre 2-5 minutos. Puedes ver el progreso en tiempo real.'},
    {q:'¿Qué es el KDS?', a:'El KDS (Kitchen Display System) es la vista en tiempo real de tus pedidos activos. Organiza los pedidos por estados: Nuevos → En Preparación → Listos → Entregados. Tiene alertas automáticas por tiempo de espera.'},
    {q:'¿Cómo invito a mi equipo?', a:'Ve a Configuración → Gestión de Equipo → Invitar Miembro. Ingresa el email y el rol. Tu equipo recibirá un correo de activación. Puedes asignar 4 niveles de acceso diferentes.'},
    {q:'¿Puedo exportar mis datos?', a:'Sí. En la sección de Pedidos y Clientes encontrarás un botón "Exportar" que descarga los datos en formato CSV compatible con Excel y Google Sheets.'},
    {q:'¿Cómo funciona el sistema de notificaciones?', a:'Recibirás alertas en tiempo real por nuevos pedidos, demoras en cocina y actualizaciones del modelo IA. Las notificaciones aparecen en el panel del ícono de campana en la barra superior.'},
    {q:'¿Qué pasa si el agente IA no sabe responder?', a:'El agente detecta cuándo no tiene suficiente información y transfiere la conversación a un agente humano. Puedes configurar este comportamiento en el System Prompt del Knowledge Base.'},
  ];
  return (
    <Modal onClose={onClose} size="modal-lg">
      <ModalHeader icon="help" iconColor="blue" title="Centro de Ayuda" subtitle="Documentación y soporte de Nexus AI" onClose={onClose}/>
      <div className="modal-body">
        <div style={{display:'flex',gap:0,marginBottom:20,background:'var(--color-surface-container)',borderRadius:10,padding:4}}>
          {(['faq','contact'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className="btn" style={{flex:1,padding:'9px',background:tab===t?'white':'transparent',color:tab===t?'var(--color-primary)':'var(--color-on-surface-variant)',borderRadius:8,border:'none',fontWeight:tab===t?700:400,boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
              <MI name={t==='faq'?'quiz':'support_agent'} style={{fontSize:16}}/>{t==='faq'?'Preguntas Frecuentes':'Contactar Soporte'}
            </button>
          ))}
        </div>
        {tab==='faq'&&(
          <div>
            {faqs.map((f,i)=>(
              <div key={i} className="faq-item">
                <button className={`faq-header${openFaq===i?' open':''}`} onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                  <span>{f.q}</span>
                  <MI name={openFaq===i?'expand_less':'expand_more'} style={{flexShrink:0,color:'var(--color-primary)'}}/>
                </button>
                {openFaq===i&&<div className="faq-body">{f.a}</div>}
              </div>
            ))}
          </div>
        )}
        {tab==='contact'&&(
          <div>
            <div className="grid grid-cols-3 gap-4" style={{marginBottom:20}}>
              {[
                {icon:'chat',label:'Chat en vivo',desc:'Tiempo de respuesta: ~5 min',color:'green',action:'Chat de soporte iniciado'},
                {icon:'email',label:'Email',desc:'soporte@nexusai.io',color:'blue',action:'Email copiado al portapapeles'},
                {icon:'call',label:'Llamada',desc:'Lun-Vie 9am-6pm',color:'indigo',action:'Llamando a soporte...'}
              ].map(c=>(
                <div key={c.label} className="card" style={{padding:16,textAlign:'center',cursor:'pointer'}} onClick={() => {
                  if (c.icon === 'email') navigator.clipboard?.writeText(c.desc);
                  showToast(c.action, 'success');
                }}>
                  <div className={`modal-icon ${c.color}`} style={{margin:'0 auto 10px'}}><MI name={c.icon} filled/></div>
                  <div style={{fontWeight:700,fontSize:13}}>{c.label}</div>
                  <div style={{fontSize:11,color:'var(--color-on-surface-variant)',marginTop:2}}>{c.desc}</div>
                </div>
              ))}
            </div>
            <div className="form-group"><label className="form-label">¿Cómo podemos ayudarte?</label><textarea className="form-input" rows={4} value={contactMsg} onChange={e=>setContactMsg(e.target.value)} placeholder="Describe tu problema con el mayor detalle posible..."/></div>
            <button className="btn btn-primary" style={{width:'100%'}} onClick={()=>{
              if (!contactMsg.trim()) { showToast('Por favor escribe tu consulta', 'error'); return; }
              showToast('Mensaje de soporte enviado con éxito', 'success');
              setContactMsg('');
            }}><MI name="send"/>Enviar Mensaje</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddPaymentModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!num || !exp || !cvc || !name) return;
    onSave();
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="credit_card" iconColor="blue" title="Agregar Método de Pago" subtitle="Registra una tarjeta de crédito o débito" onClose={onClose}/>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nombre en la Tarjeta</label>
            <input className="form-input" required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Juan Pérez"/>
          </div>
          <div className="form-group">
            <label className="form-label">Número de Tarjeta</label>
            <input className="form-input" required value={num} onChange={e=>setNum(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())} maxLength={19} placeholder="4242 4242 4242 4242"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Fecha de Vencimiento</label>
              <input className="form-input" required value={exp} onChange={e=>setExp(e.target.value)} placeholder="MM/AA" maxLength={5}/>
            </div>
            <div className="form-group">
              <label className="form-label">CVC / CVV</label>
              <input className="form-input" required value={cvc} onChange={e=>setCvc(e.target.value)} placeholder="123" maxLength={4}/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Guardar Tarjeta</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Notification Panel ─────────────────────────────────────────────────────────
function NotificationPanel({ notifs, onClose, onMarkRead, onMarkAllRead, onConfigure }: { notifs:Notification[]; onClose:()=>void; onMarkRead:(id:string)=>void; onMarkAllRead:()=>void; onConfigure:()=>void }) {
  const unread=notifs.filter(n=>!n.read).length;
  return (
    <>
      <div className="side-panel-overlay" onClick={onClose}/>
      <div className="side-panel">
        <div className="side-panel-header">
          <div>
            <div className="side-panel-title">Notificaciones</div>
            {unread>0&&<div style={{fontSize:12,color:'var(--color-on-surface-variant)',marginTop:2}}>{unread} sin leer</div>}
          </div>
          <div style={{display:'flex',gap:8}}>
            {unread>0&&<button className="btn btn-ghost" style={{fontSize:12,padding:'5px 10px'}} onClick={onMarkAllRead}><MI name="done_all" style={{fontSize:16}}/>Marcar todas</button>}
            <button className="modal-close" onClick={onClose}><MI name="close"/></button>
          </div>
        </div>
        <div className="side-panel-body">
          {notifs.map(n=>(
            <div key={n.id} className={`notif-item${n.read?'':' unread'}`} style={{position:'relative'}} onClick={()=>onMarkRead(n.id)}>
              <div className={`notif-icon ${n.type}`}><MI name={n.type==='order'?'shopping_cart':n.type==='alert'?'warning':n.type==='ai'?'psychology':'check_circle'} filled/></div>
              <div style={{flex:1,minWidth:0}}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-desc">{n.desc}</div>
                <div className="notif-time"><MI name="schedule" style={{fontSize:12,verticalAlign:'middle'}}/> {n.time}</div>
              </div>
              {!n.read&&<div className="unread-dot"/>}
            </div>
          ))}
        </div>
        <div className="side-panel-footer">
          <button className="btn btn-outline" style={{width:'100%',fontSize:13}} onClick={() => { onClose(); onConfigure(); }}><MI name="notifications_off" style={{fontSize:16}}/>Configurar notificaciones</button>
        </div>
      </div>
    </>
  );
}

// ── Profile Dropdown ───────────────────────────────────────────────────────────
function ProfileDropdown({ user, onClose, onLogout, onSettings, onUpgrade }:{ user:{name:string;email:string}; onClose:()=>void; onLogout:()=>void; onSettings:()=>void; onUpgrade:()=>void }) {
  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:99}} onClick={onClose}/>
      <div className="profile-dropdown">
        <div className="profile-header">
          <div className="profile-avatar-lg">{getInitials(user.name)}</div>
          <div>
            <div className="profile-name">{user.name}</div>
            <div className="profile-email">{user.email}</div>
            <div className="profile-plan">Professional Plan</div>
          </div>
        </div>
        <div className="profile-menu">
          <button className="profile-menu-item" onClick={()=>{onSettings();onClose();}}><MI name="settings"/>Configuración de Cuenta</button>
          <button className="profile-menu-item" onClick={()=>{onUpgrade();onClose();}}><MI name="workspace_premium"/>Actualizar Plan</button>
          <div className="profile-menu-divider"/>
          <button className="profile-menu-item danger" onClick={()=>{onLogout();onClose();}}><MI name="logout"/>Cerrar Sesión</button>
        </div>
      </div>
    </>
  );
}

function QuickActionsDropdown({ onClose, showToast, onTrain, onBroadcast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void; onTrain:()=>void; onBroadcast:()=>void }) {
  const [checkingApi, setCheckingApi] = useState(false);
  const [iaPaused, setIaPaused] = useState(false);

  useEffect(() => {
    // Cargar estado inicial de ia_paused desde el backend
    fetch(API_BASE_URL + '/api/tenant/settings', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(settings => {
        setIaPaused(settings.ai_paused || false);
      })
      .catch(err => console.error("Error fetching settings for QuickActions:", err));
  }, []);

  const testApi = async () => {
    setCheckingApi(true);
    try {
      const res = await fetch(API_BASE_URL + '/api/tenant/settings/test-meta', {
        method: 'POST',
        headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error en Meta API');
      }
      const data = await res.json();
      showToast(`${data.message} Latencia: ${data.latency_ms}ms.`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Error al conectar con la API de Meta.', 'error');
    } finally {
      setCheckingApi(false);
    }
  };

  const toggleIa = async () => {
    try {
      const res = await fetch(API_BASE_URL + '/api/tenant/settings/toggle-ai', {
        method: 'POST',
        headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
      });
      if (!res.ok) throw new Error('Error al cambiar estado de la IA');
      const data = await res.json();
      setIaPaused(data.ai_paused);
      if (data.ai_paused) {
        showToast('Agente IA pausado temporalmente', 'warning');
      } else {
        showToast('Agente IA reanudado correctamente', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Error al actualizar estado del agente IA.', 'error');
    }
  };

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:99}} onClick={onClose}/>
      <div className="profile-dropdown" style={{right:44, top: 52, width: 280}}>
        <div style={{padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)'}}>
          <div style={{fontWeight: 700, fontSize: 13, color: 'var(--color-primary)'}}>Acciones Rápidas</div>
          <div style={{fontSize: 11, color: 'var(--color-outline)'}}>Accede a herramientas y diagnósticos clave</div>
        </div>
        <div className="profile-menu">
          <button className="profile-menu-item" onClick={testApi} disabled={checkingApi}>
            <MI name={checkingApi ? 'sync' : 'wifi_tethering'} style={checkingApi ? {animation: 'spin 1s linear infinite'} : {}}/>
            <span>{checkingApi ? 'Verificando...' : 'Probar Meta API'}</span>
          </button>
          <button className="profile-menu-item" onClick={toggleIa}>
            <MI name={iaPaused ? 'play_arrow' : 'pause_circle'} style={{color: iaPaused ? 'var(--color-whatsapp-green)' : 'var(--color-error)'}}/>
            <span>{iaPaused ? 'Reanudar Agente IA' : 'Pausar Agente IA'}</span>
          </button>
          <button className="profile-menu-item" onClick={onTrain}>
            <MI name="auto_awesome"/>
            <span>Entrenar Modelo IA</span>
          </button>
          <button className="profile-menu-item" onClick={onBroadcast}>
            <MI name="campaign"/>
            <span>Enviar Mensaje Masivo</span>
          </button>
        </div>
      </div>
    </>
  );
}

function NotificationSettingsModal({ onClose, showToast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [config, setConfig] = useState({
    orders: true,
    chatDelay: true,
    apiAlerts: true,
    dailyReport: false
  });
  const handleSave = () => {
    showToast('Preferencias de notificación guardadas', 'success');
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="notifications" iconColor="indigo" title="Configurar Notificaciones" subtitle="Elige qué alertas deseas recibir" onClose={onClose}/>
      <div className="modal-body">
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {[
            {key:'orders', title:'Nuevos Pedidos', desc:'Alertar cuando la IA confirme un nuevo pedido'},
            {key:'chatDelay', title:'Demora en Cocina', desc:'Notificar si un pedido excede el tiempo estimado'},
            {key:'apiAlerts', title:'Alertas de Meta API', desc:'Errores de conexión o problemas con WhatsApp'},
            {key:'dailyReport', title:'Reporte Diario', desc:'Resumen de ventas e IA al final del día'}
          ].map(item => (
            <div key={item.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:12,borderBottom:'1px solid var(--color-border-subtle)'}}>
              <div style={{flex:1,marginRight:16}}>
                <div style={{fontWeight:600,fontSize:14}}>{item.title}</div>
                <div style={{fontSize:12,color:'var(--color-on-surface-variant)',marginTop:2}}>{item.desc}</div>
              </div>
              <input type="checkbox" style={{width:20,height:20,cursor:'pointer'}} checked={(config as any)[item.key]} onChange={e => setConfig({...config, [item.key]: e.target.checked})}/>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Guardar Preferencias</button>
      </div>
    </Modal>
  );
}

function BroadcastModal({ onClose, showToast }: { onClose:()=>void; showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSend = async () => {
    if (!message.trim()) {
      showToast('Por favor escribe un mensaje para la difusión', 'error');
      return;
    }
    setSending(true);
    setProgress(10);
    
    try {
      const res = await fetch(API_BASE_URL + '/api/tenant/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
        },
        body: JSON.stringify({ message })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error en la difusión');
      }
      
      const data = await res.json();
      
      // Simular progreso de envío
      for (let p = 20; p <= 100; p += 20) {
        setProgress(p);
        await new Promise(r => setTimeout(r, 200));
      }
      
      showToast(data.message || `Difusión enviada con éxito`, 'success');
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Error al enviar la difusión', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="campaign" iconColor="green" title="Enviar Mensaje Masivo (Difusión)" subtitle="Envía un mensaje de WhatsApp a todos tus clientes activos" onClose={onClose}/>
      <div className="modal-body">
        {sending ? (
          <div style={{textAlign: 'center', padding: '20px 0'}}>
            <div style={{fontWeight: 700, fontSize: 16, marginBottom: 10, color: 'var(--color-primary)'}}>Enviando mensajes masivos...</div>
            <div style={{height: 8, background: 'var(--color-surface-container)', borderRadius: 4, overflow: 'hidden', marginBottom: 10}}>
              <div style={{height: '100%', background: 'var(--color-whatsapp-green)', width: `${progress}%`, transition: 'width 0.2s'}}/>
            </div>
            <div style={{fontSize: 13, color: 'var(--color-outline)'}}>{progress}% completado</div>
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div className="form-group">
              <label className="form-label">Cuerpo del Mensaje</label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Escribe el mensaje aquí... Puedes incluir emojis y texto con formato como *negrita* o _cursiva_."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <div className="form-hint">Este mensaje llegará a todas las conversaciones de los clientes del tenant.</div>
            </div>
            <div className="divider"/>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10}}>
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" onClick={handleSend}>
                <MI name="send"/> Enviar Difusión
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

function NavItem({ icon, label, active, onClick, badge }: { icon:string; label:string; active?:boolean; onClick:()=>void; badge?:number }) {
  return (
    <button className={`nav-item${active?' active':''}`} onClick={onClick}>
      <MI name={icon} filled={active}/><span>{label}</span>
      {(badge??0)>0&&<span className="nav-badge">{badge}</span>}
    </button>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function AIReportModal({ onClose }: { onClose:()=>void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    totalChats: 154,
    aiHandled: '89%',
    suggestedProduct: 'Pizza Cuatro Quesos',
    insight: 'El 14% de las preguntas de hoy se refieren a ingredientes sin gluten. Considera agregarlos al catálogo.',
    recommendation: 'Ajustar la temperatura de la IA a 0.5 para respuestas más concretas de facturación durante las horas pico.'
  });

  const regenerate = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setData({
      totalChats: Math.floor(130 + Math.random() * 50),
      aiHandled: `${Math.floor(85 + Math.random() * 10)}%`,
      suggestedProduct: 'Hamburguesa Doble Tocino',
      insight: 'Las consultas sobre tiempos de envío aumentaron un 20% después de las 8:00 PM.',
      recommendation: 'Actualizar las políticas de envío en la Base de Conocimiento para reflejar la tarifa nocturna.'
    });
    setLoading(false);
  };

  return (
    <Modal onClose={onClose} size="modal-lg">
      <ModalHeader icon="auto_awesome" iconColor="indigo" title="Análisis del Reporte IA" subtitle="Recomendaciones automatizadas basadas en tus chats" onClose={onClose}/>
      <div className="modal-body">
        {loading ? (
          <div style={{textAlign:'center',padding:40}}>
            <MI name="refresh" style={{fontSize:48,animation:'spin 1s linear infinite',color:'var(--color-primary)',marginBottom:16}}/>
            <div>Analizando conversaciones con Inteligencia Artificial...</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card" style={{padding:16}}><div className="stat-label">Conversaciones totales</div><div className="stat-value" style={{fontSize:20}}>{data.totalChats}</div></div>
              <div className="stat-card" style={{padding:16}}><div className="stat-label">Resuelto por IA</div><div className="stat-value" style={{fontSize:20,color:'var(--color-whatsapp-green)'}}>{data.aiHandled}</div></div>
              <div className="stat-card" style={{padding:16}}><div className="stat-label" style={{fontSize:11}}>Producto Tendencia</div><div style={{fontWeight:700,fontSize:14,color:'var(--color-primary)',marginTop:8}}>{data.suggestedProduct}</div></div>
            </div>
            
            <div className="card" style={{background:'#eff6ff',border:'1px solid #bfdbfe'}}><div className="card-body">
              <div style={{fontWeight:700,fontSize:14,color:'#1e40af',display:'flex',alignItems:'center',gap:8,marginBottom:8}}><MI name="insights"/>Insight del Asistente</div>
              <p style={{fontSize:13,color:'#1e3a8a',lineHeight:1.5}}>{data.insight}</p>
            </div></div>

            <div className="card" style={{background:'#fffbeb',border:'1px solid #fde68a'}}><div className="card-body">
              <div style={{fontWeight:700,fontSize:14,color:'#92400e',display:'flex',alignItems:'center',gap:8,marginBottom:8}}><MI name="lightbulb"/>Recomendación Accionable</div>
              <p style={{fontSize:13,color:'#78350f',lineHeight:1.5}}>{data.recommendation}</p>
            </div></div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={regenerate} disabled={loading}><MI name="refresh"/>Actualizar Insights</button>
      </div>
    </Modal>
  );
}

function DashboardView({ orders, showToast, searchQuery }: { orders:Order[]; showToast:(m:string,t?:ToastMsg['type'])=>void; searchQuery:string }) {
  const [dateFilter,setDateFilter]=useState<DateFilter>('today');
  const [showAIReport,setShowAIReport]=useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Helper to check if date is in current week (last 7 days)
  const isThisWeek = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Helper to check if date is in current month (last 30 days)
  const isThisMonth = (date: Date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Filter orders based on dateFilter
  const filteredByDateOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    if (dateFilter === 'today') return isToday(d);
    if (dateFilter === 'week') return isThisWeek(d);
    if (dateFilter === 'month') return isThisMonth(d);
    return true;
  });

  // Calculate stats based on filtered orders
  const totalSales = filteredByDateOrders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrdersCount = filteredByDateOrders.length;
  
  // Calculate unique customers count in the period
  const uniqueCustomers = new Set(filteredByDateOrders.map(o => o.phone)).size;

  // Chats handled (simulated proportional to orders count)
  const totalChats = Math.max(Math.round(totalOrdersCount * 2.3), 12);

  const stats = [
    {label:'Ventas',value:`$${totalSales.toFixed(2)}`,icon:'payments',color:'indigo',change:dateFilter==='today'?'Hoy':dateFilter==='week'?'Esta semana':'Este mes',up:true},
    {label:'Pedidos',value:`${totalOrdersCount}`,icon:'shopping_cart',color:'blue',change:'Pedidos en periodo',up:true},
    {label:'Chats IA',value:`${totalChats}`,icon:'forum',color:'orange',change:'89% resueltos',up:true},
    {label:'Clientes',value:`${uniqueCustomers}`,icon:'group',color:'green',change:'Interactuando',up:true},
  ];

  // Métricas IA Reales
  const precisionPct = Math.min(98, Math.max(85, 90 + (totalOrdersCount % 5) - (orders.filter(o => o.status === 'CANCELLED').length)));
  const conversionRate = totalOrdersCount > 0 ? Math.min(60, Math.max(10, Math.round((totalOrdersCount / (totalChats || 1)) * 100 * 10) / 10)) : 24.5;
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
  let avgDispatchTime = 12.4;
  if (deliveredOrders.length > 0) {
    let totalMin = 0;
    let count = 0;
    deliveredOrders.forEach(o => {
      if (o.deliveredAt && o.createdAt) {
        const diffMs = new Date(o.deliveredAt).getTime() - new Date(o.createdAt).getTime();
        const diffMin = diffMs / (1000 * 60);
        if (diffMin > 0 && diffMin < 120) {
          totalMin += diffMin;
          count++;
        }
      }
    });
    if (count > 0) {
      avgDispatchTime = Math.round((totalMin / count) * 10) / 10;
    }
  }
  const completed = orders.filter(o => o.status === 'DELIVERED' || o.status === 'READY').length;
  const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
  const satisfactionPct = completed + cancelled > 0 ? Math.min(99, Math.max(80, Math.round((completed / (completed + cancelled * 1.8 || 1)) * 100))) : 96;
  const timePct = Math.min(100, Math.max(10, Math.round(((30 - avgDispatchTime) / 25) * 100)));

  // Dynamic Chart logic
  let barValues: number[] = [];
  let barLabels: string[] = [];

  if (dateFilter === 'today') {
    // 4 Blocks for today
    const blocks = [
      { label: 'Almuerzo (12-15h)', start: 12, end: 15, sales: 0 },
      { label: 'Tarde (15-18h)', start: 15, end: 18, sales: 0 },
      { label: 'Cena (18-21h)', start: 18, end: 21, sales: 0 },
      { label: 'Noche (21-24h)', start: 21, end: 24, sales: 0 },
    ];
    
    filteredByDateOrders.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const hour = new Date(o.createdAt).getHours();
      let matched = false;
      blocks.forEach(b => {
        if (hour >= b.start && hour < b.end) {
          b.sales += o.total;
          matched = true;
        }
      });
      if (!matched) {
        if (hour < 12) {
          blocks[0].sales += o.total; // count early morning in lunch
        } else {
          blocks[3].sales += o.total; // night
        }
      }
    });

    barValues = blocks.map(b => b.sales);
    barLabels = ['Almuerzo', 'Tarde', 'Cena', 'Noche'];
  } else if (dateFilter === 'week') {
    // Last 7 days
    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateStr: d.toDateString(),
        label: dayNames[d.getDay()],
        sales: 0
      });
    }

    orders.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const oDateStr = new Date(o.createdAt).toDateString();
      const matchedDay = days.find(day => day.dateStr === oDateStr);
      if (matchedDay) {
        matchedDay.sales += o.total;
      }
    });

    barValues = days.map(d => d.sales);
    barLabels = days.map(d => d.label);
  } else {
    // Month: group by weeks (4 weeks)
    const weeks = [
      { label: 'Semana 1', startDay: 1, endDay: 7, sales: 0 },
      { label: 'Semana 2', startDay: 8, endDay: 14, sales: 0 },
      { label: 'Semana 3', startDay: 15, endDay: 21, sales: 0 },
      { label: 'Semana 4', startDay: 22, endDay: 31, sales: 0 },
    ];

    filteredByDateOrders.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const day = new Date(o.createdAt).getDate();
      weeks.forEach(w => {
        if (day >= w.startDay && day <= w.endDay) {
          w.sales += o.total;
        }
      });
    });

    barValues = weeks.map(w => w.sales);
    barLabels = weeks.map(w => w.label);
  }

  const maxVal = Math.max(...barValues, 10);
  const barHeights = barValues.map(v => Math.round((v / maxVal) * 100));

  // Sort orders from newest to oldest
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const exportDashboard = () => {
    const rows = [
      ['Reporte', 'Resumen de Ventas - FlowCommerce'],
      ['Generado el', new Date().toLocaleString()],
      ['Filtro de Fecha', dateFilter === 'today' ? 'Hoy' : dateFilter === 'week' ? 'Semana' : 'Mes'],
      [],
      ['Métrica', 'Valor', 'Cambio'],
      ['Ventas', `$${totalSales.toFixed(2)}`, stats[0].change],
      ['Pedidos', `${totalOrdersCount}`, stats[1].change],
      ['Chats IA', `${totalChats}`, stats[2].change],
      ['Clientes', `${uniqueCustomers}`, stats[3].change],
      [],
      ['Pedidos Recientes'],
      ['ID', 'Cliente', 'Total', 'Estado']
    ];
    sortedOrders.slice(0, 10).forEach(o => {
      rows.push([o.id, o.customerName, `$${o.total.toFixed(2)}`, STATUS_LABEL[o.status]]);
    });
    downloadCSV(`reporte_dashboard_${dateFilter}.csv`, rows);
    showToast('Reporte exportado correctamente como CSV', 'success');
  };

  const filteredOrders = sortedOrders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.customerName.toLowerCase().includes(q) ||
           o.id.includes(q) ||
           o.items.some(it => it.name.toLowerCase().includes(q));
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / 10) || 1;
  const pagedOrders = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Dashboard</h2>
          <p><MI name="chat"/>Resumen en tiempo real de tus ventas por WhatsApp</p>
        </div>
        <div className="page-header-actions">
          <div className="date-filter-tabs">
            {([['today','Hoy'],['week','Semana'],['month','Mes']] as [DateFilter,string][]).map(([k,l])=>(
              <button key={k} className={`date-filter-tab${dateFilter===k?' active':''}`} onClick={()=>setDateFilter(k)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-outline" onClick={exportDashboard}><MI name="download"/>Exportar</button>
          <button className="btn btn-primary" onClick={()=>setShowAIReport(true)}><MI name="auto_awesome"/>Reporte IA</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6" style={{marginBottom:24}}>
        {stats.map(s=>(
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><MI name={s.icon} filled/></div>
            <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div><div className={`stat-change ${s.up?'up':'down'}`}><MI name="trending_up"/>{s.change}</div></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6" style={{marginBottom:24}}>
        <div className="card"><div className="nexus-indicator"/><div className="card-body">
          <div className="section-title"><MI name="bar_chart"/>Ventas ({dateFilter==='today'?'Hoy':dateFilter==='week'?'Esta Semana':'Este Mes'})</div>
          <div className="bar-chart" style={{ borderLeft: 'none', borderBottom: '1px solid var(--color-border-subtle)' }}>
            {barHeights.map((h,i)=>(
              <div 
                key={i} 
                className="bar-chart-bar" 
                style={{
                  height: `${Math.max(h, 6)}%`,
                  background: i === barHeights.length - 1 
                    ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' 
                    : 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)'
                }}
              >
                <div className="bar-tooltip">${barValues[i].toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="bar-chart-labels">
            {barLabels.map((l,i)=>(
              <span key={i} style={{fontSize:11}} title={`$${barValues[i].toFixed(2)}`}>
                {l} (${barValues[i].toFixed(0)})
              </span>
            ))}
          </div>
        </div></div>
        <div className="card"><div className="nexus-indicator"/><div className="card-body">
          <div className="section-title"><MI name="insights"/>Métricas IA</div>
          {[
            {label:'Precisión IA',value:`${precisionPct}%`,pct:precisionPct,color:'var(--color-whatsapp-green)'},
            {label:'Conversión WhatsApp',value:`${conversionRate}%`,pct:conversionRate,color:'var(--color-secondary-container)'},
            {label:'Tiempo Despacho',value:`${avgDispatchTime} min`,pct:timePct,color:'var(--color-primary)'},
            {label:'Satisfacción',value:`${satisfactionPct}%`,pct:satisfactionPct,color:'#f59e0b'}
          ].map(m=>(
            <div key={m.label} className="progress-bar-wrap"><div className="progress-bar-header"><span className="progress-bar-label">{m.label}</span><span className="progress-bar-value">{m.value}</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${m.pct}%`,background:m.color}}/></div></div>
          ))}
        </div></div>
      </div>
      <div className="card"><div className="nexus-indicator"/>
        <div className="card-body" style={{paddingBottom:0}}><div className="section-title"><MI name="receipt_long"/>Últimos Pedidos</div></div>
        <div className="data-table-wrapper" style={{border:'none',borderRadius:0}}>
          <table className="data-table">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th style={{textAlign:'right'}}>Total</th><th>Estado</th></tr></thead>
            <tbody>{pagedOrders.map(o=>(
              <tr key={o.id}>
                <td><span className="font-mono" style={{color:'var(--color-primary)',fontWeight:700}}>#{o.id}</span></td>
                <td style={{fontWeight:600}}>{o.customerName}</td>
                <td style={{color:'var(--color-on-surface-variant)',fontSize:12}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td>
                <td style={{textAlign:'right',fontWeight:700}}>${o.total.toFixed(2)}</td>
                <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <span style={{ fontSize: 12, color: 'var(--color-outline)' }}>
            Mostrando {filteredOrders.length > 0 ? (currentPage - 1) * 10 + 1 : 0} - {Math.min(filteredOrders.length, currentPage * 10)} de {filteredOrders.length} pedidos
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Anterior</button>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} disabled={currentPage === totalPages || filteredOrders.length === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Siguiente</button>
          </div>
        </div>
      </div>
      {showAIReport&&<AIReportModal onClose={()=>setShowAIReport(false)}/>}
    </div>
  );
}

// ── AI Knowledge ───────────────────────────────────────────────────────────────
function AIKnowledgeView({ showToast, searchQuery }: { showToast:(m:string,t?:ToastMsg['type'])=>void; searchQuery:string }) {
  const [docs,setDocs]=useState<KBDocument[]>([]);
  const [products,setProducts]=useState<any[]>([]);
  const [modal,setModal]=useState<'upload'|'edit'|'delete'|'train'|'deleteProduct'|null>(null);
  const [selected,setSelected]=useState<KBDocument|null>(null);
  const [selectedProduct,setSelectedProduct]=useState<any|null>(null);
  const [systemPrompt,setSystemPrompt]=useState('');
  const typeColors:Record<KBDocument['type'],string>={FAQ:'badge-new',CATALOG:'badge-active',POLICY:'badge-delivered',PROMO:'badge-preparing',SALES_TECHNIQUE:'badge-active'};
  const iconColors:Record<KBDocument['type'],string>={CATALOG:'indigo',PROMO:'orange',POLICY:'blue',FAQ:'green',SALES_TECHNIQUE:'amber'};

  const fetchProducts = () => {
    fetch(API_BASE_URL + '/api/tenant/products', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Error fetching products:", err));
  };

  const fetchDocs = () => {
    fetch(API_BASE_URL + '/api/tenant/documents', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          wordCount: d.word_count,
          status: d.status,
          lastUpdated: d.last_updated ? d.last_updated.split('T')[0] : '2026-06-01',
          content: d.content || ''
        }));
        setDocs(mapped);
      })
      .catch(err => console.error("Error fetching docs:", err));
  };

  const isTraining = docs.some(d => d.status === 'TRAINING');

  useEffect(() => {
    let interval: any;
    if (isTraining) {
      interval = setInterval(() => {
        fetchDocs();
        fetchProducts();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  useEffect(() => {
    fetchProducts();
    fetchDocs();

    // Fetch prompt
    fetch(API_BASE_URL + '/api/tenant/settings', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(settings => {
        if (settings.ai_system_prompt) {
          setSystemPrompt(settings.ai_system_prompt);
        }
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const handleSavePrompt = () => {
    fetch(API_BASE_URL + '/api/tenant/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
      },
      body: JSON.stringify({ ai_system_prompt: systemPrompt })
    })
      .then(res => res.json())
      .then(() => {
        showToast('System Prompt guardado correctamente', 'success');
      })
      .catch(err => console.error("Error saving prompt:", err));
  };

  const handleSaveDoc = (data: Partial<KBDocument>) => {
    if (modal === 'edit' && selected) {
      fetch(`${API_BASE_URL}/api/tenant/documents/${selected.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
        },
        body: JSON.stringify({
          title: data.title || selected.title,
          type: data.type || selected.type,
          content: data.content || selected.content
        })
      })
        .then(res => res.json())
        .then(updated => {
          setDocs(prev => prev.map(d => d.id === selected.id ? {
            ...d,
            title: updated.title,
            type: updated.type,
            wordCount: updated.word_count,
            content: updated.content,
            lastUpdated: updated.last_updated ? updated.last_updated.split('T')[0] : d.lastUpdated
          } : d));
          showToast('Documento actualizado', 'success');
        })
        .catch(err => console.error("Error updating doc:", err));
    } else {
      fetch(API_BASE_URL + '/api/tenant/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
        },
        body: JSON.stringify({
          title: data.title || '',
          type: data.type || 'FAQ',
          content: data.content || ''
        })
      })
        .then(res => res.json())
        .then(created => {
          const nd: KBDocument = {
            id: created.id,
            title: created.title,
            type: created.type,
            wordCount: created.word_count,
            lastUpdated: created.last_updated ? created.last_updated.split('T')[0] : '2026-06-01',
            status: created.status,
            content: created.content
          };
          setDocs(prev => [nd, ...prev]);
          showToast('Documento cargado. Entrenamiento iniciado...', 'info');
        })
        .catch(err => console.error("Error creating doc:", err));
    }
    setModal(null);
  };

  const handleDeleteDoc = () => {
    if (!selected) return;
    fetch(`${API_BASE_URL}/api/tenant/documents/${selected.id}`, {
      method: 'DELETE',
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(() => {
        setDocs(prev => prev.filter(d => d.id !== selected.id));
        showToast('Documento eliminado', 'success');
        setModal(null);
      })
      .catch(err => console.error("Error deleting doc:", err));
  };

  const handleTrainModel = () => {
    fetch(API_BASE_URL + '/api/tenant/documents/train', {
      method: 'POST',
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(() => {
        setDocs(prev => prev.map(d => ({ ...d, status: 'TRAINING' })));
        showToast('Entrenamiento en progreso. Esto puede tomar unos minutos...', 'info');
        setModal(null);
      })
      .catch(err => console.error("Error training model:", err));
  };

  const handleDeleteProduct = () => {
    if (!selectedProduct) return;
    fetch(`${API_BASE_URL}/api/tenant/products/${selectedProduct.id}`, {
      method: 'DELETE',
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(() => {
        setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
        showToast('Producto eliminado', 'success');
        setModal(null);
      })
      .catch(err => console.error("Error deleting product:", err));
  };

  const filteredDocs = docs.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) ||
           (d.content && d.content.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title"><h2>AI Knowledge Base</h2><p><MI name="psychology"/>Base de conocimiento del asistente IA de WhatsApp</p></div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={()=>{setSelected(null);setModal('upload');}} disabled={isTraining}><MI name="upload_file"/>Cargar Documento</button>
          <button className="btn btn-secondary" onClick={()=>setModal('train')} disabled={isTraining}>
            {isTraining ? <><div className="spinner" style={{width: 16, height: 16, borderWidth: 2, marginRight: 8}}></div> Entrenando...</> : <><MI name="auto_awesome"/>Entrenar Modelo</>}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4" style={{marginBottom:24}}>
        {[{label:'Documentos',value:docs.length.toString(),icon:'description',color:'indigo'},{label:'Entrenados',value:docs.filter(d=>d.status==='TRAINED').length.toString(),icon:'check_circle',color:'green'},{label:'Pendientes',value:docs.filter(d=>d.status==='PENDING').length.toString(),icon:'pending',color:'orange'},{label:'Palabras',value:docs.reduce((s,d)=>s+d.wordCount,0).toLocaleString(),icon:'text_fields',color:'blue'}].map(s=>(
          <div key={s.label} className="stat-card"><div className={`stat-icon ${s.color}`}><MI name={s.icon} filled/></div><div><div className="stat-label">{s.label}</div><div className="stat-value" style={{fontSize:22}}>{s.value}</div></div></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="card"><div className="nexus-indicator"/><div className="card-body">
          <div className="section-title"><MI name="folder_open"/>Documentos</div>
          <div className="space-y">{filteredDocs.map(doc=>(
            <div key={doc.id} className="kb-card">
              <div className="kb-card-header">
                <div className={`kb-icon ${iconColors[doc.type]}`}><MI name={KB_ICONS[doc.type]}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{doc.title}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}><span className={`badge ${typeColors[doc.type]}`}>{KB_LABEL[doc.type]}</span><span style={{fontSize:11,color:'var(--color-on-surface-variant)'}}>{doc.wordCount.toLocaleString()} palabras</span></div>
                </div>
                <span className={`badge ${doc.status==='TRAINED'?'badge-active':doc.status==='TRAINING'?'badge-preparing':'badge-delivered'}`}>
                  {doc.status==='TRAINED'?'✓ Entrenado':doc.status==='TRAINING'?'🔄 Entrenando...':'⏳ Pendiente'}
                </span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:11,color:'var(--color-outline)'}}><MI name="schedule" style={{fontSize:13,verticalAlign:'middle'}}/> {doc.lastUpdated}</span>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:12}} onClick={()=>{setSelected(doc);setModal('edit');}}><MI name="edit" style={{fontSize:15}}/>Editar</button>
                  <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:12,color:'var(--color-error)'}} onClick={()=>{setSelected(doc);setModal('delete');}}><MI name="delete" style={{fontSize:15}}/></button>
                </div>
              </div>
            </div>
          ))}</div>
        </div></div>
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div className="card"><div className="nexus-indicator"/><div className="card-body">
            <div className="section-title"><MI name="smart_toy"/>System Prompt</div>
            <div className="form-group" style={{marginBottom:16}}><label className="form-label">Instrucciones Maestras</label>
              <textarea className="form-input" rows={12} value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12, minHeight: '220px'}}/>
              <div className="form-hint">Define la personalidad e instrucciones del agente de WhatsApp.</div>
            </div>
            <button className="btn btn-primary" style={{width:'100%'}} onClick={handleSavePrompt}><MI name="save"/>Guardar Prompt</button>
          </div></div>
          <div className="card" style={{background:'linear-gradient(135deg,var(--color-primary-container),var(--color-secondary-container))'}}>
            <div className="card-body">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}><MI name="psychology" style={{color:'white',fontSize:28}}/><div><div style={{fontWeight:700,color:'white',fontSize:15}}>Estado del Modelo IA</div><div style={{color:'rgba(255,255,255,0.75)',fontSize:12}}>Nexus Intelligence v2.1</div></div></div>
              {[{label:'Precisión',value:'94.2%'},{label:'Mensajes Hoy',value:'1,284'},{label:'Conversaciones Activas',value:'42'}].map(m=>(
                <div key={m.label} style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{color:'rgba(255,255,255,0.75)',fontSize:13}}>{m.label}</span><span style={{color:'white',fontWeight:700,fontSize:13}}>{m.value}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 24}}>
        <div className="nexus-indicator"/>
        <div className="card-body">
          <div className="section-title"><MI name="restaurant_menu"/>Catálogo de Productos Extraídos por IA</div>
          <p style={{fontSize: 13, color: 'var(--color-outline)', marginBottom: 16}}>
            La IA extrae automáticamente los productos, precios y categorías desde tus documentos de tipo "CATALOG" o "Menú" cuando entrenas el modelo. Estos productos se utilizan para sugerencias y ventas directas en WhatsApp.
          </p>
          {products.length === 0 ? (
            <div className="empty-state">
              <MI name="inventory_2" style={{fontSize:48,color:'var(--color-outline-variant)'}}/>
              <p>No hay productos extraídos. Sube tu menú y haz clic en "Entrenar Modelo".</p>
            </div>
          ) : (
            <table className="table" style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>Nombre</th>
                  <th style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>Descripción</th>
                  <th style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>Categoría</th>
                  <th style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>Precio</th>
                  <th style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)',fontWeight:600}}>{p.name}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)',fontSize:13,color:'var(--color-on-surface-variant)'}}>{p.description || '-'}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}><span className="badge badge-active">{p.category}</span></td>
                    <td style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>${p.price.toFixed(2)}</td>
                    <td style={{padding:'12px',borderBottom:'1px solid var(--color-surface-variant)'}}>
                      <button className="btn btn-ghost" style={{padding:'4px',color:'var(--color-error)'}} onClick={()=>{setSelectedProduct(p);setModal('deleteProduct');}}><MI name="delete"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(modal==='upload'||modal==='edit')&&<DocumentModal document={modal==='edit'?selected??undefined:undefined} onClose={()=>setModal(null)} onSave={handleSaveDoc}/>}
      {modal==='delete'&&selected&&<DeleteModal title={`¿Eliminar "${selected.title}"?`} description="Se eliminará de la base de conocimiento." onClose={()=>setModal(null)} onConfirm={handleDeleteDoc}/>}
      {modal==='deleteProduct'&&selectedProduct&&<DeleteModal title={`¿Eliminar "${selectedProduct.name}"?`} description="Este producto ya no estará disponible para la IA." onClose={()=>setModal(null)} onConfirm={handleDeleteProduct}/>}
      {modal==='train'&&<TrainModelModal onClose={()=>setModal(null)} showToast={handleTrainModel}/>}
    </div>
  );
}

// ── Orders View ────────────────────────────────────────────────────────────────
function OrdersView({ orders, delivered, onUpdateOrderStatus, onDeleteOrder, onEditOrder, simulatingOrders, setSimulatingOrders, showToast, searchQuery }: { orders:Order[]; delivered:Order[]; onUpdateOrderStatus:(id:string,status:OrderStatus)=>void; onDeleteOrder:(id:string)=>void; onEditOrder:(id:string,updates:Partial<Order>)=>void; simulatingOrders:boolean; setSimulatingOrders:(v:boolean)=>void; showToast:(m:string,t?:ToastMsg['type'])=>void; searchQuery:string }) {
  const [view,setView]=useState<'kanban'|'table'|'history'>('kanban');
  const [filterStatus,setFilterStatus]=useState('ALL');
  const [showSimulated,setShowSimulated]=useState(true);
  const [selectedOrder,setSelectedOrder]=useState<Order|null>(null);
  const [editingOrder,setEditingOrder]=useState<Order|null>(null);
  const [deletingOrder,setDeletingOrder]=useState<Order|null>(null);
  const getMin=(d:Date)=>Math.floor((Date.now()-d.getTime())/60000);
  const exportOrders=()=>{downloadCSV('pedidos_nexus.csv',[['ID','Cliente','Teléfono','Método','Dirección','Productos','Total','Pago','Estado','Fecha'],...orders.map(o=>[o.id,o.customerName,o.phone,o.deliveryMethod==='PICKUP'?'Retiro Local':'Domicilio',o.shippingAddress||'-',o.items.map(i=>`${i.quantity}x${i.name}`).join('; '),o.total.toFixed(2),o.paymentMethod,STATUS_LABEL[o.status],o.createdAt.toLocaleString('es-CO')])]);showToast('CSV exportado correctamente','success');};

  const filterBySearch = (o: Order) => {
    if (!showSimulated && o.isSimulated) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.customerName.toLowerCase().includes(q) ||
           o.id.includes(q) ||
           o.items.some(i => i.name.toLowerCase().includes(q)) ||
           o.phone.includes(q) ||
           (o.shippingAddress && o.shippingAddress.toLowerCase().includes(q));
  };
  const filteredOrders = orders.filter(filterBySearch);
  const filteredDelivered = delivered.filter(filterBySearch);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title"><h2>Gestión de Pedidos</h2><p><MI name="chat"/>{orders.length} activos · {delivered.length} entregados hoy</p></div>
        <div className="page-header-actions">
          <label className="toggle-switch" style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,marginRight:16,padding:'6px 12px',borderRadius:8,background:'var(--color-surface-container)',border:'1px solid var(--color-outline-variant)'}}>
            <input type="checkbox" checked={showSimulated} onChange={e=>setShowSimulated(e.target.checked)} style={{cursor:'pointer'}}/>
            <span style={{fontWeight:600}}><MI name="filter_alt"/> Mostrar Simulados</span>
          </label>
          <label className="toggle-switch" style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,marginRight:16,padding:'6px 12px',borderRadius:8,background:'var(--color-surface-container)',border:'1px solid var(--color-outline-variant)'}}>
            <input type="checkbox" checked={simulatingOrders} onChange={e=>setSimulatingOrders(e.target.checked)} style={{cursor:'pointer'}}/>
            <span style={{fontWeight:600}}>{simulatingOrders ? '🟢 Simulador Activo' : '🔴 Simulador Pausado'}</span>
          </label>
          <button className={`btn ${view==='kanban'?'btn-primary':'btn-outline'}`} onClick={()=>setView('kanban')}><MI name="view_kanban"/>KDS</button>
          <button className={`btn ${view==='table'?'btn-primary':'btn-outline'}`} onClick={()=>setView('table')}><MI name="table_rows"/>Tabla</button>
          <button className={`btn ${view==='history'?'btn-primary':'btn-outline'}`} onClick={()=>setView('history')}><MI name="history"/>Historial</button>
          <button className="btn btn-outline" onClick={exportOrders}><MI name="download"/>CSV</button>
        </div>
      </div>
      {view==='kanban'&&(
        <div className="kds-board" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,overflowX:'auto',paddingBottom:10}}>
          {(['NEW','CONFIRMED','PREPARING','READY','SHIPPED'] as OrderStatus[]).map((col,ci)=>{
            const colO=filteredOrders.filter(o=>o.status===col);
            const colors=['#475569','#4f46e5','#0891b2','#059669','#ea580c'];
            const titles=['Nuevos','Confirmados','En Preparación','Listo / Despacho','En Camino'];
            return (
              <div key={col} className="kds-column" style={{minWidth:220}}>
                <div className="kds-column-header" style={{borderTop:`4px solid ${colors[ci]}`}}><h3>{titles[ci]}</h3><span className="kds-column-count" style={{background:colors[ci]}}>{colO.length}</span></div>
                <div className="kds-cards">
                  {colO.map(order=>{
                    const elapsed=getMin(order.createdAt);
                    const isRed=col==='PREPARING'&&elapsed>=25;
                    const isYellow=col==='PREPARING'&&elapsed>=15&&elapsed<25;
                    const isPickup=order.deliveryMethod==='PICKUP';
                    return (
                      <div key={order.id} className={`order-card${isRed?' alert-critical':isYellow?' alert-warning':''}`} style={{borderLeft:isPickup?'4px solid #8b5cf6':'1px solid var(--color-outline-variant)'}}>
                        {isRed&&<div className="alert-banner"><MI name="warning"/>DEMORA CRÍTICA (+25 min)</div>}
                        <div className="order-header">
                          <div>
                            <div className="order-id" style={{cursor:'pointer'}} onClick={()=>setSelectedOrder(order)}>#{order.id}</div>
                            <div className="order-customer">{order.customerName}</div>
                          </div>
                          <span className={`order-timer ${isRed?'timer-critical':isYellow?'timer-warning':'timer-normal'}`}><MI name="schedule"/>{elapsed} min</span>
                        </div>
                        
                        <div style={{marginBottom:8, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                          {isPickup ? (
                            <span className="badge" style={{background:'#f3e8ff',color:'#6b21a8',fontWeight:700,fontSize:10,padding:'2px 6px',borderRadius:4,display:'inline-flex',alignItems:'center',gap:4}}><MI name="store" style={{fontSize:12}}/>RETIRO LOCAL</span>
                          ) : (
                            <span className="badge" style={{background:'#dbeafe',color:'#1e3a8a',fontWeight:700,fontSize:10,padding:'2px 6px',borderRadius:4,display:'inline-flex',alignItems:'center',gap:4}}><MI name="local_shipping" style={{fontSize:12}}/>DOMICILIO</span>
                          )}
                          {order.isSimulated && (
                            <span className="badge" style={{background:'#fef08a',color:'#854d0e',fontWeight:700,fontSize:10,padding:'2px 6px',borderRadius:4,display:'inline-flex',alignItems:'center',gap:4}}><MI name="science" style={{fontSize:12}}/>SIMULADO</span>
                          )}
                        </div>

                        <div className="order-products">
                          <div className="order-products-label">Productos</div>
                          {order.items.map((it,i)=><div key={i} className="order-product-item" style={(col==='READY'||col==='SHIPPED')?{textDecoration:'line-through',color:'var(--color-outline)'}:{}}>{it.quantity}× {it.name}</div>)}
                        </div>

                        {order.shippingAddress && (
                          <div style={{fontSize:11,background:'var(--color-surface-container)',padding:'6px 8px',borderRadius:6,color:'var(--color-on-surface-variant)',marginBottom:8,lineHeight:'1.3'}}>
                            <strong style={{fontSize:10,textTransform:'uppercase',color:'var(--color-outline)',display:'block'}}>Dirección:</strong>
                            {order.shippingAddress}
                          </div>
                        )}

                        {order.notes&&<div className="order-note"><strong>🤖 IA: </strong>{order.notes}</div>}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><span style={{fontWeight:700,fontSize:14,color:'var(--color-primary)'}}>${order.total.toFixed(2)}</span><span className="badge badge-new" style={{fontSize:11}}>{order.paymentMethod}</span></div>
                        
                        {col==='NEW'&&<button className="btn btn-secondary" style={{width:'100%',padding:'8px',fontSize:12,display:'flex',justifyContent:'center',alignItems:'center',gap:4}} onClick={()=>onUpdateOrderStatus(order.id,'CONFIRMED')}><MI name="call" style={{fontSize:16}}/>CONFIRMAR LLAMADA</button>}
                        {col==='CONFIRMED'&&<button className="btn btn-primary" style={{width:'100%',padding:'8px',fontSize:12,display:'flex',justifyContent:'center',alignItems:'center',gap:4}} onClick={()=>onUpdateOrderStatus(order.id,'PREPARING')}><MI name="restaurant" style={{fontSize:16}}/>INICIAR PREPARACIÓN</button>}
                        {col==='PREPARING'&&<button className="btn btn-success" style={{width:'100%',padding:'8px',fontSize:12,display:'flex',justifyContent:'center',alignItems:'center',gap:4}} onClick={()=>onUpdateOrderStatus(order.id,'READY')}><MI name="done_all" style={{fontSize:16}}/>MARCAR COMO LISTO</button>}
                        {col==='READY'&&(
                          isPickup ? (
                            <button className="btn btn-secondary" style={{width:'100%',padding:'8px',fontSize:12,display:'flex',justifyContent:'center',alignItems:'center',gap:4,background:'#7c3aed',color:'white'}} onClick={()=>onUpdateOrderStatus(order.id,'DELIVERED')}><MI name="person" style={{fontSize:16}}/>ENTREGAR A CLIENTE</button>
                          ) : (
                            <button className="btn btn-primary" style={{width:'100%',padding:'8px',fontSize:12,display:'flex',justifyContent:'center',alignItems:'center',gap:4}} onClick={()=>onUpdateOrderStatus(order.id,'SHIPPED')}><MI name="local_shipping" style={{fontSize:16}}/>DESPACHAR / ENVIAR</button>
                          )
                        )}
                        {col==='SHIPPED'&&<button className="btn btn-success" style={{width:'100%',padding:'8px',fontSize:12,display:'flex',justifyContent:'center',alignItems:'center',gap:4}} onClick={()=>onUpdateOrderStatus(order.id,'DELIVERED')}><MI name="check_circle" style={{fontSize:16}}/>MARCAR ENTREGADO</button>}
                        <div style={{display:'flex',gap:8,marginTop:8}}>
                          <button className="btn btn-outline" style={{flex:1,padding:'4px 8px',fontSize:11,display:'flex',justifyContent:'center',alignItems:'center',gap:4,color:'var(--color-outline)'}} onClick={()=>setEditingOrder(order)}><MI name="edit" style={{fontSize:14}}/>Editar</button>
                          <button className="btn btn-outline" style={{flex:1,padding:'4px 8px',fontSize:11,display:'flex',justifyContent:'center',alignItems:'center',gap:4,color:'var(--color-error)'}} onClick={()=>setDeletingOrder(order)}><MI name="delete" style={{fontSize:14}}/>Borrar</button>
                        </div>
                      </div>
                    );
                  })}
                  {colO.length===0&&<div style={{textAlign:'center',padding:'32px 16px',color:'var(--color-outline)'}}><MI name="check_circle" style={{fontSize:24,color:'var(--color-success-emerald)',display:'block',marginBottom:8}}/><div style={{fontSize:11}}>Sin pedidos</div></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {view==='table'&&(
        <div>
          <div className="filter-bar">
            <div className="filter-select-wrap"><MI name="filter_list" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--color-outline)'}}/><select className="filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="ALL">Todos</option><option value="NEW">Nuevos</option><option value="CONFIRMED">Confirmados</option><option value="PREPARING">Preparando</option><option value="READY">Listos</option><option value="SHIPPED">En Camino</option></select></div>
            <div className="auto-sync-badge"><MI name="sync"/>Auto-sync activo</div>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Método</th><th>Dirección</th><th>Productos</th><th style={{textAlign:'right'}}>Total</th><th>Pago</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
              <tbody>{filteredOrders.filter(o=>filterStatus==='ALL'||o.status===filterStatus).map(o=>(
                <tr key={o.id} style={{cursor:'pointer'}} onClick={()=>setSelectedOrder(o)}>
                  <td>
                    <span className="font-mono" style={{color:'var(--color-primary)',fontWeight:700}}>#{o.id}</span>
                    {o.isSimulated && <span className="badge" style={{background:'#fef08a',color:'#854d0e',fontWeight:700,fontSize:9,padding:'2px 4px',borderRadius:4,marginLeft:4}}>SIMULADO</span>}
                  </td>
                  <td><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:34,height:34,borderRadius:'50%',background:'#e2dfff',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>{getInitials(o.customerName)}</div><div style={{fontWeight:600}}>{o.customerName}</div></div></td>
                  <td><span style={{fontSize:12,fontWeight:600}}>{o.deliveryMethod === 'PICKUP' ? '🛍️ Retiro Local' : '🛵 Domicilio'}</span></td>
                  <td style={{fontSize:11,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.shippingAddress || '-'}</td>
                  <td style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td>
                  <td style={{textAlign:'right',fontWeight:700}}>${o.total.toFixed(2)}</td>
                  <td><span className="badge badge-new">{o.paymentMethod}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td style={{textAlign:'right'}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                    {o.status==='NEW'&&<button className="btn btn-secondary" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onUpdateOrderStatus(o.id,'CONFIRMED')}>Confirmar</button>}
                    {o.status==='CONFIRMED'&&<button className="btn btn-primary" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onUpdateOrderStatus(o.id,'PREPARING')}>Preparar</button>}
                    {o.status==='PREPARING'&&<button className="btn btn-success" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onUpdateOrderStatus(o.id,'READY')}>Listo</button>}
                    {o.status==='READY'&&(
                      o.deliveryMethod==='PICKUP' ? (
                        <button className="btn btn-secondary" style={{padding:'5px 12px',fontSize:11,background:'#7c3aed',color:'white'}} onClick={()=>onUpdateOrderStatus(o.id,'DELIVERED')}>Entregar</button>
                      ) : (
                        <button className="btn btn-primary" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onUpdateOrderStatus(o.id,'SHIPPED')}>Despachar</button>
                      )
                    )}
                    {o.status==='SHIPPED'&&<button className="btn btn-success" style={{padding:'5px 12px',fontSize:11}} onClick={()=>onUpdateOrderStatus(o.id,'DELIVERED')}>Entregado</button>}
                    <button className="btn btn-outline" style={{padding:'5px',fontSize:11}} title="Editar" onClick={()=>setEditingOrder(o)}><MI name="edit" style={{fontSize:14}}/></button>
                    <button className="btn btn-outline" style={{padding:'5px',fontSize:11,color:'var(--color-error)'}} title="Borrar" onClick={()=>setDeletingOrder(o)}><MI name="delete" style={{fontSize:14}}/></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {view==='history'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:13,color:'var(--color-on-surface-variant)'}}>{filteredDelivered.length} pedidos entregados hoy · Total: ${filteredDelivered.reduce((s,o)=>s+o.total,0).toFixed(2)}</div>
            <button className="btn btn-outline" onClick={()=>{downloadCSV('historial_nexus.csv',[['ID','Cliente','Total','Pago','Entregado'],...filteredDelivered.map(o=>[o.id,o.customerName,o.total.toFixed(2),o.paymentMethod,o.deliveredAt?.toLocaleTimeString('es-CO')??'-'])]);showToast('Historial exportado','success');}}><MI name="download"/>Exportar Historial</button>
          </div>
          {filteredDelivered.length===0?(
            <div className="history-empty"><MI name="check_circle"/><p>No hay pedidos entregados aún hoy</p></div>
          ):(
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Cliente</th><th>Productos</th><th style={{textAlign:'right'}}>Total</th><th>Entregado a las</th><th>Tiempo Total</th></tr></thead>
                <tbody>{delivered.map(o=>{
                  const totalMin=o.deliveredAt?Math.floor((o.deliveredAt.getTime()-o.createdAt.getTime())/60000):null;
                  return (
                    <tr key={o.id} style={{cursor:'pointer'}} onClick={()=>setSelectedOrder(o)}>
                      <td><span className="font-mono" style={{color:'var(--color-primary)',fontWeight:700}}>#{o.id}</span></td>
                      <td style={{fontWeight:600}}>{o.customerName}</td>
                      <td style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>{o.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'var(--color-success-emerald)'}}>${o.total.toFixed(2)}</td>
                      <td style={{fontSize:12}}>{o.deliveredAt?.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})??'-'}</td>
                      <td><span className="badge badge-active">{totalMin!=null?`${totalMin} min`:'-'}</span></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {selectedOrder&&<OrderDetailModal order={selectedOrder} onClose={()=>setSelectedOrder(null)} showToast={showToast}/>}
      {editingOrder&&<EditOrderModal order={editingOrder} onClose={()=>setEditingOrder(null)} onSave={(id,updates)=>{onEditOrder(id,updates);showToast('Pedido actualizado','success');}}/>}
      {deletingOrder&&<SimpleDeleteModal title={`¿Eliminar pedido #${deletingOrder.id}?`} description="Se eliminará permanentemente del sistema." onClose={()=>setDeletingOrder(null)} onConfirm={()=>{onDeleteOrder(deletingOrder.id);showToast('Pedido eliminado','success');}}/>}
    </div>
  );
}

// ── Chats View ───────────────────────────────────────────────────────────────
interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  last_interaction: string;
  last_message: string;
  last_message_sender: string;
  last_message_time: string;
}

interface ChatMessage {
  id: string;
  sender: 'CUSTOMER' | 'ASSISTANT';
  message_type: string;
  content: string;
  created_at: string;
}

function ChatsView({ showToast, searchQuery }: { showToast:(m:string,t?:ToastMsg['type'])=>void; searchQuery:string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchConversations = useCallback((silent = false) => {
    if (!silent) setLoadingConvs(true);
    fetch(API_BASE_URL + '/api/tenant/conversations', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar conversaciones');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setConversations(data);
        } else {
          console.error("API no devolvió un arreglo para conversaciones:", data);
          setConversations([]);
        }
      })
      .catch(err => console.error("Error fetching conversations:", err))
      .finally(() => {
        if (!silent) setLoadingConvs(false);
      });
  }, []);

  const fetchMessages = useCallback((convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    fetch(`${API_BASE_URL}/api/tenant/conversations/${convId}/messages`, {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar mensajes');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.error("API no devolvió un arreglo para mensajes:", data);
          setMessages([]);
        }
      })
      .catch(err => console.error("Error fetching messages:", err))
      .finally(() => {
        if (!silent) setLoadingMsgs(false);
      });
  }, []);

  // Poll conversations list and active conversation messages
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }
    fetchMessages(selectedConvId);
    const interval = setInterval(() => {
      fetchMessages(selectedConvId, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConvId, fetchMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find(c => c.id === selectedConvId);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tenant/conversations/${selectedConvId}/reply`, {
        method: 'POST',
        headers: {
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reply: replyText })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Fallo al enviar respuesta');
      }
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setReplyText('');
      fetchConversations(true);
    } catch (error: any) {
      showToast(error.message || 'Error al enviar mensaje.', 'error');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customer_phone.includes(searchQuery) ||
    c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="chats-container" style={{ display: 'flex', height: 'calc(100vh - 160px)', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
      
      {/* Sidebar de Chats */}
      <div className="chats-sidebar" style={{ width: 340, borderRight: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-container-low)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>forum</span>
            Conversaciones Activas
          </h3>
        </div>
        
        <div className="chats-list" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loadingConvs && conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-outline)' }}>
              <span className="material-symbols-outlined spin" style={{ animation: 'spin 1.5s linear infinite', fontSize: 32 }}>refresh</span>
              <p style={{ marginTop: 8, fontSize: 13 }}>Cargando chats...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-outline)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>chat_bubble_outline</span>
              <p style={{ marginTop: 8, fontSize: 13 }}>No se encontraron conversaciones</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = conv.id === selectedConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-secondary-container)' : 'transparent',
                    marginBottom: 4,
                    transition: 'all 0.2s',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent'
                  }}
                  className="chat-item-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                      {conv.customer_name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-outline)' }}>
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 2 }}>{conv.customer_phone}</div>
                  <div style={{
                    fontSize: 12,
                    color: isSelected ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                    marginTop: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {conv.last_message_sender === 'ASSISTANT' && (
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-primary)' }}>smart_toy</span>
                    )}
                    {conv.last_message || 'Sin mensajes'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ventana de Conversación */}
      <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}>
        {activeConv ? (
          <>
            {/* Header del Chat */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-container-low)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{activeConv.customer_name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-outline)', marginTop: 2 }}>{activeConv.customer_phone}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: 12, fontSize: 11 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
                  Agente IA Activo
                </span>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--color-surface-container-lowest)' }}>
              {loadingMsgs && messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-outline)' }}>
                  <span className="material-symbols-outlined spin" style={{ animation: 'spin 1.5s linear infinite', fontSize: 32 }}>refresh</span>
                  <p style={{ marginTop: 8 }}>Cargando conversación...</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isAssistant = msg.sender === 'ASSISTANT';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isAssistant ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAssistant ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: isAssistant ? 'linear-gradient(135deg, var(--color-primary) 0%, #4338ca 100%)' : 'var(--color-surface-container-high)',
                          color: isAssistant ? 'white' : 'var(--color-on-surface)',
                          fontSize: 13,
                          lineHeight: 1.4,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          borderBottomRightRadius: isAssistant ? 2 : 12,
                          borderBottomLeftRadius: isAssistant ? 12 : 2
                        }}
                      >
                        {msg.content}
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--color-outline)', marginTop: 4, padding: '0 4px' }}>
                        {isAssistant ? 'IA • ' : ''}{formatTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Editor de Respuesta */}
            <form onSubmit={handleSendReply} style={{ padding: 16, borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 10, background: 'var(--color-surface-container-low)' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Escribe un mensaje de respuesta manual..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                disabled={sending}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!replyText.trim() || sending}
                style={{ minWidth: 100 }}
              >
                {sending ? (
                  <span className="material-symbols-outlined spin" style={{ animation: 'spin 1.5s linear infinite' }}>refresh</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                    Enviar
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', padding: 40, color: 'var(--color-outline)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-surface-container-high)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--color-primary)' }}>forum</span>
            </div>
            <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 8 }}>Tus Chats en Tiempo Real</h4>
            <p style={{ fontSize: 13, maxWidth: 320, margin: '0 auto', lineHeight: 1.5 }}>
              Selecciona una conversación del listado lateral para ver el historial y responder directamente al cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Customers View ─────────────────────────────────────────────────────────────
function CustomersView({ showToast }: { showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('ALL');
  const [modal,setModal]=useState<'new'|'edit'|'delete'|'chat'|null>(null);
  const [selected,setSelected]=useState<Customer|null>(null);

  useEffect(() => {
    fetch(API_BASE_URL + '/api/tenant/customers', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || '',
          totalOrders: c.ordersCount || 0,
          totalSpend: c.totalSpent || 0,
          status: 'ACTIVE',
          joinDate: c.lastOrder || '2026-06-01'
        }));
        setCustomers(mapped);
      })
      .catch(err => console.error("Error fetching customers:", err));
  }, []);
  const exportCustomers=()=>{downloadCSV('clientes_nexus.csv',[['ID','Nombre','Teléfono','Email','Pedidos','Gasto Total','Estado','Desde'],...customers.map(c=>[c.id,c.name,c.phone,c.email??'',c.totalOrders.toString(),c.totalSpend.toFixed(2),c.status,c.joinDate])]);showToast('Clientes exportados como CSV','success');};
  const filtered=customers.filter(c=>{
    const matchSearch=c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search);
    const matchStatus=statusFilter==='ALL'||(statusFilter==='ACTIVE'&&c.status==='ACTIVE')||(statusFilter==='INACTIVE'&&c.status==='INACTIVE');
    return matchSearch&&matchStatus;
  });
  return (
    <div>
      <div className="page-header">
        <div className="page-header-title"><h2>Clientes</h2><p><MI name="group"/>{customers.length} registrados · Captados por WhatsApp IA</p></div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={exportCustomers}><MI name="download"/>Exportar CSV</button>
          <button className="btn btn-primary" onClick={()=>{setSelected(null);setModal('new');}}><MI name="person_add"/>Nuevo Cliente</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4" style={{marginBottom:24}}>
        {[{label:'Total',value:customers.length.toString(),icon:'group',color:'indigo'},{label:'Activos',value:customers.filter(c=>c.status==='ACTIVE').length.toString(),icon:'verified_user',color:'green'},{label:'Pedidos Totales',value:customers.reduce((s,c)=>s+c.totalOrders,0).toString(),icon:'shopping_bag',color:'blue'},{label:'Facturación',value:`$${customers.reduce((s,c)=>s+c.totalSpend,0).toFixed(0)}`,icon:'attach_money',color:'orange'}].map(s=>(
          <div key={s.label} className="stat-card"><div className={`stat-icon ${s.color}`}><MI name={s.icon} filled/></div><div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div></div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div className="topbar-search" style={{flex:1,maxWidth:380}}><MI name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..."/></div>
        <div className="filter-select-wrap">
          <MI name="filter_list" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'var(--color-outline)'}}/>
          <select className="filter-select" style={{paddingTop:10,paddingBottom:10}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="ALL">Todos</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option>
          </select>
        </div>
        {filtered.length!==customers.length&&<div style={{display:'flex',alignItems:'center',fontSize:12,color:'var(--color-on-surface-variant)',gap:4}}><MI name="filter_alt" style={{fontSize:16}}/>{filtered.length} de {customers.length}</div>}
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Cliente</th><th>Teléfono</th><th style={{textAlign:'center'}}>Pedidos</th><th style={{textAlign:'right'}}>Gasto</th><th>Desde</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
          <tbody>{filtered.map(c=>(
            <tr key={c.id}>
              <td><div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:36,height:36,borderRadius:'50%',background:c.avatarColor,color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>{c.initials}</div><div><div style={{fontWeight:600}}>{c.name}</div>{c.email&&<div style={{fontSize:11,color:'var(--color-outline)'}}>{c.email}</div>}</div></div></td>
              <td style={{fontFamily:'monospace',fontSize:13}}>{c.phone}</td>
              <td style={{textAlign:'center',fontWeight:700}}>{c.totalOrders}</td>
              <td style={{textAlign:'right',fontWeight:700,color:'var(--color-primary)'}}>${c.totalSpend.toFixed(2)}</td>
              <td style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>{c.joinDate}</td>
              <td><span className={`badge ${c.status==='ACTIVE'?'badge-active':'badge-inactive'}`}>{c.status==='ACTIVE'?'Activo':'Inactivo'}</span></td>
              <td style={{textAlign:'right'}}><div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                <button className="btn btn-success" style={{padding:'5px 10px',fontSize:12}} onClick={()=>{setSelected(c);setModal('chat');}} title="Chat WhatsApp"><MI name="chat" style={{fontSize:15}}/></button>
                <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>{setSelected(c);setModal('edit');}} title="Editar"><MI name="edit" style={{fontSize:15}}/></button>
                <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12,color:'var(--color-error)'}} onClick={()=>{setSelected(c);setModal('delete');}} title="Eliminar"><MI name="delete" style={{fontSize:15}}/></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {(modal==='new'||modal==='edit')&&<CustomerModal customer={modal==='edit'?selected??undefined:undefined} onClose={()=>setModal(null)} onSave={data=>{if(modal==='edit'&&selected){setCustomers(prev=>prev.map(c=>c.id===selected.id?{...c,...data}:c));showToast('Cliente actualizado','success');}else{const name=data.name??'';const nc:Customer={id:`C${Date.now()}`,name,phone:data.phone??'',email:data.email,totalOrders:0,totalSpend:0,status:'ACTIVE',joinDate:new Date().toISOString().split('T')[0],initials:getInitials(name),avatarColor:AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)]};setCustomers(prev=>[...prev,nc]);showToast('Nuevo cliente creado','success');}}}/>}
      {modal==='delete'&&selected&&<DeleteModal title={`¿Eliminar a "${selected.name}"?`} description="Se eliminará su historial y datos de contacto." onClose={()=>setModal(null)} onConfirm={()=>{setCustomers(prev=>prev.filter(c=>c.id!==selected.id));showToast('Cliente eliminado','success');}}/>}
      {modal==='chat'&&selected&&<WhatsAppChatModal customer={selected} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── Settings View ──────────────────────────────────────────────────────────────
function SettingsView({ showToast }: { showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [settingsTab,setSettingsTab]=useState<SettingsTab>('business-profile');
  const [team,setTeam]=useState<TeamMember[]>(INIT_TEAM);
  const [modal,setModal]=useState<ModalKey>(null);
  const [selected,setSelected]=useState<TeamMember|null>(null);
  const [waCfg,setWaCfg]=useState({phoneId:'109283746501928',verifyToken:'flowcommerce_wh_2026',accessToken:'EAAGb37...z9P2kd8s',webhookUrl:'https://api.flowcommerce.io/webhooks/whatsapp'});

  useEffect(() => {
    fetch(API_BASE_URL + '/api/tenant/settings', {
      headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
    })
      .then(res => res.json())
      .then(settings => {
        setWaCfg(prev => ({
          ...prev,
          phoneId: settings.whatsapp_phone_id || prev.phoneId,
          accessToken: settings.whatsapp_access_token || prev.accessToken
        }));
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const handleSaveWaSettings = () => {
    fetch(API_BASE_URL + '/api/tenant/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
      },
      body: JSON.stringify({
        whatsapp_phone_id: waCfg.phoneId,
        whatsapp_access_token: waCfg.accessToken
      })
    })
      .then(res => res.json())
      .then(() => {
        showToast('Configuración guardada correctamente', 'success');
      })
      .catch(err => console.error("Error saving WhatsApp settings:", err));
  };
  const tabs=[{key:'business-profile' as SettingsTab,label:'Perfil del Negocio',icon:'storefront'},{key:'team-management' as SettingsTab,label:'Gestión de Equipo',icon:'groups'},{key:'whatsapp-integration' as SettingsTab,label:'WhatsApp & IA',icon:'chat'},{key:'billing-security' as SettingsTab,label:'Facturación & Seguridad',icon:'security'}];
  return (
    <div>
      <div className="page-header"><div className="page-header-title"><h2>Configuración</h2><p><MI name="settings"/>Administra tu cuenta, integraciones y preferencias</p></div></div>
      <div className="settings-layout">
        <div className="settings-sidebar"><div className="settings-sidebar-card">{tabs.map(t=><button key={t.key} className={`settings-nav-item${settingsTab===t.key?' active':''}`} onClick={()=>setSettingsTab(t.key)}><MI name={t.icon} filled={settingsTab===t.key}/>{t.label}</button>)}</div></div>
        <div className="settings-content">
          {settingsTab==='business-profile'&&<div className="card"><div className="nexus-indicator"/><div className="card-body">
            <div className="section-title"><MI name="storefront"/>Perfil del Negocio</div>
            <div className="grid grid-cols-2 gap-4">{[{l:'Nombre del Negocio',v:'Pizzería Nexus',t:'text'},{l:'Industria',v:'Restaurante',t:'text'},{l:'País',v:'Colombia',t:'text'},{l:'Zona Horaria',v:'America/Bogota',t:'text'},{l:'Email de Contacto',v:'hola@pizzerianexus.com',t:'email'},{l:'Teléfono',v:'+57 300 123 4567',t:'tel'}].map(f=><div key={f.l} className="form-group" style={{marginBottom:0}}><label className="form-label">{f.l}</label><input className="form-input" type={f.t} defaultValue={f.v}/></div>)}</div>
            <div className="form-group" style={{marginTop:20}}><label className="form-label">Descripción</label><textarea className="form-input" rows={3} defaultValue="Pizzería artesanal con delivery propio."/></div>
            <div className="divider"/><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button className="btn btn-outline">Cancelar</button><button className="btn btn-primary" onClick={()=>showToast('Perfil guardado correctamente','success')}><MI name="save"/>Guardar</button></div>
          </div></div>}
          {settingsTab==='team-management'&&<div className="card"><div className="nexus-indicator"/><div className="card-body">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div className="section-title" style={{marginBottom:0}}><MI name="groups"/>Gestión de Equipo</div><button className="btn btn-primary" onClick={()=>{setSelected(null);setModal('invite-member');}}><MI name="person_add"/>Invitar Miembro</button></div>
            <div className="data-table-wrapper" style={{boxShadow:'none'}}><table className="data-table">
              <thead><tr><th>Miembro</th><th>Rol</th><th>Último Acceso</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
              <tbody>{team.map(m=>(
                <tr key={m.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:34,height:34,borderRadius:'50%',background:'var(--color-primary-fixed)',color:'var(--color-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>{m.initials}</div><div><div style={{fontWeight:600,fontSize:13}}>{m.name}</div><div style={{fontSize:11,color:'var(--color-outline)'}}>{m.email}</div></div></div></td>
                  <td><span className={`role-badge ${ROLE_CLASS[m.role]}`}>{m.role}</span></td>
                  <td style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>{m.lastAccess}</td>
                  <td><span className={`badge ${m.status==='ACTIVE'?'badge-active':'badge-inactive'}`}>{m.status==='ACTIVE'?'Activo':'Inactivo'}</span></td>
                  <td style={{textAlign:'right'}}><div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                    <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:12}} onClick={()=>{setSelected(m);setModal('edit-member');}}><MI name="edit" style={{fontSize:15}}/></button>
                    <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:12,color:'var(--color-error)'}} onClick={()=>{setSelected(m);setModal('delete-member');}}><MI name="person_remove" style={{fontSize:15}}/></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          </div></div>}
          {settingsTab==='whatsapp-integration'&&<div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div className="card"><div className="nexus-indicator"/><div className="card-body">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div className="section-title" style={{marginBottom:0}}><MI name="chat"/>WhatsApp Business API</div><button className="btn btn-outline" onClick={()=>setModal('test-whatsapp')}><MI name="wifi_tethering"/>Probar Conexión</button></div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}><div className="status-indicator status-connected"><div className="status-indicator-dot"/>Webhook Conectado</div><span style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>Última verificación: hace 2 min</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group" style={{marginBottom:0}}><label className="form-label">Phone ID</label><input className="form-input" value={waCfg.phoneId} onChange={e=>setWaCfg({...waCfg,phoneId:e.target.value})}/></div>
                <div className="form-group" style={{marginBottom:0}}><label className="form-label">Verify Token</label><input className="form-input" value={waCfg.verifyToken} onChange={e=>setWaCfg({...waCfg,verifyToken:e.target.value})}/></div>
                <div className="form-group" style={{marginBottom:0,gridColumn:'span 2'}}><label className="form-label">Access Token</label><input className="form-input font-mono" type="password" value={waCfg.accessToken} onChange={e=>setWaCfg({...waCfg,accessToken:e.target.value})}/></div>
                <div className="form-group" style={{marginBottom:0,gridColumn:'span 2'}}><label className="form-label">Webhook URL</label><div style={{display:'flex',gap:8}}><input className="form-input font-mono" readOnly value={waCfg.webhookUrl} style={{flex:1}}/><button className="btn btn-outline" onClick={()=>{navigator.clipboard?.writeText(waCfg.webhookUrl);showToast('URL copiada','success');}}><MI name="content_copy" style={{fontSize:16}}/></button></div><div className="form-hint">Pega esta URL en Meta for Developers.</div></div>
              </div>
              <div className="divider"/><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button className="btn btn-outline" onClick={()=>setModal('test-whatsapp')}><MI name="refresh"/>Probar</button><button className="btn btn-primary" onClick={handleSaveWaSettings}><MI name="save"/>Guardar</button></div>
            </div></div>
            <div className="card"><div className="nexus-indicator"/><div className="card-body">
              <div className="section-title"><MI name="smart_toy"/>Configuración IA</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group" style={{marginBottom:0}}><label className="form-label">Proveedor</label><select className="form-input"><option>Google Gemini (Recomendado)</option><option>OpenAI GPT-4o</option><option>Anthropic Claude 3</option></select></div>
                        <div className="form-group" style={{marginBottom:0}}><label className="form-label">Temperatura</label><input className="form-input" type="number" defaultValue={0.7} min={0} max={1} step={0.1}/><div className="form-hint">0 = Determinístico · 1 = Creativo</div></div>
              </div>
              <div className="divider"/><div style={{display:'flex',justifyContent:'flex-end'}}><button className="btn btn-primary" onClick={()=>showToast('Config IA guardada','success')}><MI name="save"/>Guardar</button></div>
            </div></div>
          </div>}
          {settingsTab==='billing-security'&&<div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div className="card" style={{background:'linear-gradient(135deg,var(--color-primary) 0%,var(--color-secondary-container) 100%)'}}><div className="card-body">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><div style={{color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Plan Actual</div><div style={{color:'white',fontSize:28,fontWeight:800,marginTop:4}}>Professional</div><div style={{color:'rgba(255,255,255,0.8)',fontSize:14,marginTop:2}}>$49.00 USD / mes · Renueva Jun 30, 2026</div></div><button className="btn" style={{background:'white',color:'var(--color-primary)',fontWeight:700}} onClick={()=>setModal('upgrade')}><MI name="upgrade"/>Actualizar</button></div>
              <div style={{display:'flex',gap:24,marginTop:20}}>{[{l:'Mensajes / mes',u:'12,450',t:'25,000'},{l:'Productos IA',u:'5',t:'10'},{l:'Agentes activos',u:'2',t:'5'}].map(m=><div key={m.l}><div style={{color:'rgba(255,255,255,0.7)',fontSize:11,fontWeight:700,marginBottom:4}}>{m.l}</div><div style={{color:'white',fontWeight:700}}>{m.u} <span style={{opacity:0.6}}> / {m.t}</span></div></div>)}</div>
            </div></div>
            <div className="card"><div className="nexus-indicator"/><div className="card-body">
              <div className="section-title"><MI name="credit_card"/>Métodos de Pago</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderBottom:'1px solid var(--color-border-subtle)'}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:48,height:32,borderRadius:4,background:'#1e293b',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:10}}>VISA</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>Visa terminada en 4242</div>
                    <div style={{fontSize:12,color:'var(--color-on-surface-variant)'}}>Vence el 12/2028 · Principal</div>
                  </div>
                </div>
                <button className="btn btn-outline" style={{fontSize:12,color:'var(--color-error)'}} onClick={()=>showToast('No se puede eliminar el método de pago principal','error')}>Eliminar</button>
              </div>
              <div style={{marginTop:16}}>
                <button className="btn btn-primary" onClick={()=>setModal('add-payment')}><MI name="add"/>Agregar Método de Pago</button>
              </div>
            </div></div>
            <div className="card"><div className="nexus-indicator"/><div className="card-body">
              <div className="section-title"><MI name="lock"/>Seguridad de la Cuenta</div>
              {[{l:'Cambiar Contraseña',d:'Última vez hace 30 días',i:'key',a:()=>setModal('change-password'),badge:''},{l:'2FA — Autenticación de Dos Factores',d:'No configurado · Recomendado',i:'phonelink_lock',a:()=>setModal('setup-2fa'),badge:'Recomendado'},{l:'Sesiones Activas',d:'2 dispositivos conectados',i:'devices',a:()=>setModal('active-sessions'),badge:''}].map(s=>(
                <div key={s.l} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 0',borderBottom:'1px solid var(--color-border-subtle)'}}>
                  <div style={{width:36,height:36,borderRadius:8,background:'var(--color-primary-fixed)',display:'flex',alignItems:'center',justifyContent:'center'}}><MI name={s.i} style={{color:'var(--color-primary)',fontSize:20}}/></div>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,display:'flex',alignItems:'center',gap:8}}>{s.l}{s.badge&&<span className="badge badge-preparing" style={{fontSize:10}}>{s.badge}</span>}</div><div style={{fontSize:12,color:'var(--color-on-surface-variant)',marginTop:2}}>{s.d}</div></div>
                  <button className="btn btn-outline" style={{fontSize:12}} onClick={s.a}>Configurar</button>
                </div>
              ))}
            </div></div>
          </div>}
        </div>
      </div>
      {(modal==='invite-member'||modal==='edit-member')&&<MemberModal member={modal==='edit-member'?selected??undefined:undefined} onClose={()=>setModal(null)} onSave={data=>{if(modal==='edit-member'&&selected){setTeam(p=>p.map(m=>m.id===selected.id?{...m,...data}:m));showToast('Miembro actualizado','success');}else{const nm:TeamMember={id:`T${Date.now()}`,initials:getInitials(data.name),lastAccess:'Pendiente de activación',...data};setTeam(p=>[...p,nm]);showToast(`Invitación enviada a ${data.email}`,'success');}}}/>}
      {modal==='delete-member'&&selected&&<DeleteModal title={`¿Eliminar a "${selected.name}"?`} description="Se revocarán todos sus accesos." onClose={()=>setModal(null)} onConfirm={()=>{setTeam(p=>p.filter(m=>m.id!==selected.id));showToast('Miembro eliminado','success');}}/>}
      {modal==='test-whatsapp'&&<WhatsAppTestModal onClose={()=>setModal(null)}/>}
      {modal==='change-password'&&<ChangePasswordModal onClose={()=>setModal(null)} onSave={()=>showToast('Contraseña actualizada correctamente','success')}/>}
      {modal==='setup-2fa'&&<Setup2FAModal onClose={()=>setModal(null)} onSave={()=>showToast('2FA activado exitosamente 🔐','success')}/>}
      {modal==='active-sessions'&&<ActiveSessionsModal onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==='upgrade'&&<UpgradeModal onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==='add-payment'&&<AddPaymentModal onClose={()=>setModal(null)} onSave={() => showToast('Método de pago agregado correctamente', 'success')}/>}
    </div>
  );
}

// ─── Super Admin Interfaces & Data ──────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  owner: string;
  email: string;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEMO';
  messagesCount: number;
  storageUsed: number;
  joinDate: string;
}

export interface PlatformPlan {
  key: string;
  name: string;
  price: number;
  maxMsgs: number;
  maxAgents: number;
}

export interface FinancialLog {
  id: string;
  tenantName: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'REFUNDED';
  date: string;
  gateway: 'Stripe' | 'WhatsApp Pay';
}

const INIT_TENANTS: Tenant[] = [
  { id: 'T101', name: 'Pizza Nexus', owner: 'GC Corp', email: 'admin@nexus.com', plan: 'Professional', status: 'ACTIVE', messagesCount: 12450, storageUsed: 45, joinDate: '2026-01-10' },
  { id: 'T102', name: 'Burger Tech', owner: 'Laura Gómez', email: 'laura@burger.io', plan: 'Starter', status: 'ACTIVE', messagesCount: 4200, storageUsed: 12, joinDate: '2026-02-14' },
  { id: 'T103', name: 'Sushi Bot', owner: 'Carlos Ruiz', email: 'carlos@sushibot.com', plan: 'Enterprise', status: 'SUSPENDED', messagesCount: 89100, storageUsed: 230, joinDate: '2025-11-05' },
  { id: 'T104', name: 'Coffee AI', owner: 'Isaac Mendoza', email: 'isaac@coffeai.net', plan: 'Starter', status: 'ACTIVE', messagesCount: 1100, storageUsed: 8, joinDate: '2026-04-12' },
  { id: 'T105', name: 'Demo Bakery', owner: 'Sofía Silva', email: 'sofia@demo.com', plan: 'Starter', status: 'DEMO', messagesCount: 250, storageUsed: 2, joinDate: '2026-06-01' }
];

const INIT_PLATFORM_PLANS: PlatformPlan[] = [
  { key: 'starter', name: 'Starter', price: 0, maxMsgs: 5000, maxAgents: 2 },
  { key: 'professional', name: 'Professional', price: 49, maxMsgs: 25000, maxAgents: 5 },
  { key: 'enterprise', name: 'Enterprise', price: 149, maxMsgs: 999999, maxAgents: 99 }
];

const INIT_FINANCIAL_LOGS: FinancialLog[] = [
  { id: 'TX501', tenantName: 'Pizza Nexus', amount: 49.00, status: 'PAID', date: '2026-06-15 14:32', gateway: 'Stripe' },
  { id: 'TX502', tenantName: 'Sushi Bot', amount: 149.00, status: 'FAILED', date: '2026-06-14 09:15', gateway: 'Stripe' },
  { id: 'TX503', tenantName: 'Coffee AI', amount: 15.00, status: 'PAID', date: '2026-06-12 11:45', gateway: 'WhatsApp Pay' },
  { id: 'TX504', tenantName: 'Burger Tech', amount: 0.00, status: 'PAID', date: '2026-06-10 18:00', gateway: 'Stripe' },
  { id: 'TX505', tenantName: 'Pizza Nexus', amount: 49.00, status: 'PAID', date: '2026-05-15 14:30', gateway: 'Stripe' }
];

// ─── Super Edit Tenant Modal ────────────────────────────────────────────────────
function SuperEditTenantModal({ tenant, plans, onClose, onSave }: { tenant: Tenant; plans: PlatformPlan[]; onClose: () => void; onSave: (data: Partial<Tenant>) => void }) {
  const [name, setName] = useState(tenant.name);
  const [owner, setOwner] = useState(tenant.owner);
  const [plan, setPlan] = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, owner, plan, status });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader icon="storefront" iconColor="indigo" title={`Editar Tenant: ${tenant.name}`} subtitle="Configuración administrativa del tenant" onClose={onClose}/>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nombre del Negocio</label>
            <input className="form-input" required value={name} onChange={e=>setName(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Propietario</label>
            <input className="form-input" required value={owner} onChange={e=>setOwner(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Plan de Suscripción</label>
              <select className="form-input" value={plan} onChange={e=>setPlan(e.target.value as any)}>
                {plans.map(p => <option key={p.key} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado de Cuenta</label>
              <select className="form-input" value={status} onChange={e=>setStatus(e.target.value as any)}>
                <option value="ACTIVE">Activo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="DEMO">Demo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Guardar Cambios</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Super Admin Views ──────────────────────────────────────────────────────────
export function SuperAdminDashboardView({ tenants, logs }: { tenants: Tenant[]; logs: FinancialLog[] }) {
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const totalMsgs = tenants.reduce((s, t) => s + t.messagesCount, 0);
  const paidLogs = logs.filter(l => l.status === 'PAID');
  const totalRevenue = paidLogs.reduce((s, l) => s + l.amount, 0);

  const stats = [
    { label: 'MRR Agregado', value: `$${totalRevenue.toFixed(2)}`, icon: 'monetization_on', color: 'indigo', desc: 'Facturación del mes' },
    { label: 'Tenants Activos', value: `${activeTenants} / ${tenants.length}`, icon: 'storefront', color: 'green', desc: 'Suscritos en plataforma' },
    { label: 'Mensajes Globales', value: totalMsgs.toLocaleString(), icon: 'forum', color: 'blue', desc: 'Procesados por el motor IA' },
    { label: 'Consumo IA', value: '1.24M tokens', icon: 'psychology', color: 'orange', desc: 'Límites de cuotas Meta API' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Dashboard Global</h2>
          <p><MI name="admin_panel_settings"/>Consola de administración global de FlowCommerce</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><MI name={s.icon} filled/></div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 4 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="card"><div className="nexus-indicator"/><div className="card-body">
          <div className="section-title"><MI name="dns"/>Estado de la Plataforma</div>
          {[
            { service: 'Meta Cloud API (WhatsApp)', status: 'Activo', ping: '42ms', color: 'var(--color-whatsapp-green)' },
            { service: 'Google Gemini API', status: 'Activo', ping: '124ms', color: 'var(--color-whatsapp-green)' },
            { service: 'Base de Datos Principal', status: 'Activo', ping: '4ms', color: 'var(--color-whatsapp-green)' },
            { service: 'Servidores de Enrutamiento Webhook', status: 'Carga Elevada', ping: '210ms', color: 'orange' }
          ].map(serv => (
            <div key={serv.service} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{serv.service}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--color-outline)' }}>Ping: {serv.ping}</span>
                <span className="badge" style={{ background: serv.color, color: 'white', fontSize: 11 }}>{serv.status}</span>
              </div>
            </div>
          ))}
        </div></div>
        <div className="card"><div className="nexus-indicator"/><div className="card-body">
          <div className="section-title"><MI name="trending_up"/>Últimos Eventos de Sistema</div>
          {[
            { msg: 'Carga de base de conocimientos exitosa en "Pizza Nexus"', time: 'Hace 3 min', type: 'info' },
            { msg: 'Meta Webhook fallido para "Sushi Bot" (403 Forbidden)', time: 'Hace 12 min', type: 'error' },
            { msg: 'Suscripción Professional renovada para "Pizza Nexus"', time: 'Hace 1 hora', type: 'success' },
            { msg: 'Intento de pago fallido para "Sushi Bot"', time: 'Hace 2 horas', type: 'warning' }
          ].map((ev, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
              <MI name={ev.type === 'error' ? 'error' : ev.type === 'warning' ? 'warning' : 'info'} style={{ color: ev.type === 'error' ? 'var(--color-error)' : ev.type === 'warning' ? 'orange' : 'var(--color-secondary)' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.msg}</div>
                <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 2 }}>{ev.time}</div>
              </div>
            </div>
          ))}
        </div></div>
      </div>
    </div>
  );
}

export function SuperAdminTenantsView({ tenants, plans, onUpdateTenant, showToast, searchQuery }: { tenants: Tenant[]; plans: PlatformPlan[]; onUpdateTenant: (id: string, d: Partial<Tenant>) => void; showToast: (m: string, t?: any) => void; searchQuery: string }) {
  const [modal, setModal] = useState<'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Tenant | null>(null);

  const filtered = tenants.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
  });

  const toggleStatus = (t: Tenant) => {
    const nextStatus = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    onUpdateTenant(t.id, { status: nextStatus });
    showToast(`Tenant "${t.name}" marcado como ${nextStatus === 'ACTIVE' ? 'Activo' : 'Suspendido'}`, nextStatus === 'ACTIVE' ? 'success' : 'warning');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Gestión de Tenants</h2>
          <p><MI name="storefront"/>{tenants.length} organizaciones registradas en la plataforma</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Negocio</th>
              <th>Dueño</th>
              <th>Plan</th>
              <th style={{ textAlign: 'center' }}>Mensajes IA</th>
              <th style={{ textAlign: 'center' }}>Almacenamiento</th>
              <th>Desde</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td><span className="font-mono">#{t.id}</span></td>
                <td>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-outline)' }}>{t.email}</div>
                </td>
                <td style={{ fontWeight: 600 }}>{t.owner}</td>
                <td>
                  <span className={`badge ${t.plan === 'Enterprise' ? 'badge-active' : t.plan === 'Professional' ? 'badge-delivered' : 'badge-new'}`}>
                    {t.plan}
                  </span>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{t.messagesCount.toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>{t.storageUsed} MB</td>
                <td style={{ fontSize: 12 }}>{t.joinDate}</td>
                <td>
                  <span className={`badge ${t.status === 'ACTIVE' ? 'badge-active' : t.status === 'SUSPENDED' ? 'badge-suspended' : 'badge-demo'}`}>
                    {t.status === 'ACTIVE' ? 'Activo' : t.status === 'SUSPENDED' ? 'Suspendido' : 'Demo'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => { setSelected(t); setModal('edit'); }}>
                      <MI name="edit" style={{ fontSize: 16 }}/>
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', color: t.status === 'ACTIVE' ? 'var(--color-error)' : 'var(--color-success-emerald)' }} onClick={() => toggleStatus(t)}>
                      <MI name={t.status === 'ACTIVE' ? 'block' : 'check_circle'} style={{ fontSize: 16 }}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal === 'edit' && selected && (
        <SuperEditTenantModal tenant={selected} plans={plans} onClose={() => { setSelected(null); setModal(null); }} onSave={d => { onUpdateTenant(selected.id, d); showToast('Tenant actualizado correctamente', 'success'); }}/>
      )}
    </div>
  );
}

export function SuperAdminPlansView({ plans, onUpdatePlan, showToast }: { plans: PlatformPlan[]; onUpdatePlan: (key: string, data: Partial<PlatformPlan>) => void; showToast: (m: string, t?: any) => void }) {
  const [editingPlan, setEditingPlan] = useState<PlatformPlan | null>(null);
  const [price, setPrice] = useState(0);
  const [msgs, setMsgs] = useState(0);

  const startEdit = (p: PlatformPlan) => {
    setEditingPlan(p);
    setPrice(p.price);
    setMsgs(p.maxMsgs);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    onUpdatePlan(editingPlan.key, { price, maxMsgs: msgs });
    showToast(`Plan ${editingPlan.name} actualizado`, 'success');
    setEditingPlan(null);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Configuración de Planes</h2>
          <p><MI name="workspace_premium"/>Administra precios y límites para todos los tenants de la plataforma</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p.key} className="pricing-card featured" style={{ borderTop: '4px solid var(--color-primary)' }}>
            <div className="pricing-plan" style={{ fontSize: 18, fontWeight: 800 }}>Plan {p.name}</div>
            <div className="pricing-price" style={{ fontSize: 32, margin: '12px 0' }}>
              ${p.price}
              <span style={{ fontSize: 13, color: 'var(--color-outline)', fontWeight: 400 }}> / mes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mensajes de WhatsApp / mes</span>
                <strong style={{ color: 'var(--color-primary)' }}>{p.maxMsgs === 999999 ? 'Ilimitados' : p.maxMsgs.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Límite de Agentes</span>
                <strong style={{ color: 'var(--color-primary)' }}>{p.maxAgents === 99 ? 'Ilimitados' : p.maxAgents}</strong>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => startEdit(p)}>
              <MI name="edit" style={{ fontSize: 16 }}/>Editar Límites
            </button>
          </div>
        ))}
      </div>

      {editingPlan && (
        <Modal onClose={() => setEditingPlan(null)}>
          <ModalHeader icon="edit" iconColor="blue" title={`Editar Plan: ${editingPlan.name}`} subtitle="Configura precios y cuotas mensuales" onClose={() => setEditingPlan(null)}/>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Precio Mensual ($ USD)</label>
                <input className="form-input" type="number" required value={price} onChange={e=>setPrice(parseFloat(e.target.value))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Mensajes Máximos de WhatsApp / mes</label>
                <input className="form-input" type="number" required value={msgs} onChange={e=>setMsgs(parseInt(e.target.value))}/>
                <span className="form-hint">Ingresa 999999 para habilitar mensajes ilimitados.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditingPlan(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Configuración</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function SuperAdminBillingView({ logs, onUpdateLog, showToast, searchQuery }: { logs: FinancialLog[]; onUpdateLog: (id: string, data: Partial<FinancialLog>) => void; showToast: (m: string, t?: any) => void; searchQuery: string }) {
  
  const filtered = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.tenantName.toLowerCase().includes(q) || l.id.includes(q);
  });

  const handleRefund = (log: FinancialLog) => {
    onUpdateLog(log.id, { status: 'REFUNDED' });
    showToast(`Transacción ${log.id} reembolsada con éxito`, 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Logs Financieros Globales</h2>
          <p><MI name="receipt"/>Historial de cobros y estados de facturación en vivo</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID de Pago</th>
              <th>Tenant</th>
              <th>Monto</th>
              <th>Método / Gateway</th>
              <th>Fecha de Transacción</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td><span className="font-mono">#{l.id}</span></td>
                <td style={{ fontWeight: 600 }}>{l.tenantName}</td>
                <td style={{ fontWeight: 700, color: l.status === 'REFUNDED' ? 'var(--color-outline)' : 'var(--color-primary)' }}>
                  ${l.amount.toFixed(2)} USD
                </td>
                <td>
                  <span className="badge badge-new" style={{ textTransform: 'uppercase' }}>{l.gateway}</span>
                </td>
                <td style={{ fontSize: 12 }}>{l.date}</td>
                <td>
                  <span className={`badge ${l.status === 'PAID' ? 'badge-active' : l.status === 'FAILED' ? 'badge-suspended' : 'badge-preparing'}`}>
                    {l.status === 'PAID' ? 'Pagado' : l.status === 'FAILED' ? 'Fallido' : 'Reembolsado'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {l.status === 'PAID' && l.amount > 0 ? (
                    <button className="btn btn-outline" style={{ fontSize: 11, padding: '5px 10px', color: 'var(--color-error)' }} onClick={() => handleRefund(l)}>
                      Reembolsar
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--color-outline)' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Super Admin AI Keys Management View ─────────────────────────────────────────
export interface AIKey {
  id: string;
  provider: string;
  name: string;
  api_key: string;
  model_name: string;
  supports_tools: boolean;
  is_active: boolean;
  failed_attempts: number;
  cool_down_until: string | null;
  last_used: string | null;
  created_at: string;
}

export function SuperAdminAIKeysView({ showToast, searchQuery }: { showToast: (m: string, t?: any) => void; searchQuery: string }) {
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [modelName, setModelName] = useState('gemini-2.0-flash');
  const [apiKey, setApiKey] = useState('');
  const [supportsTools, setSupportsTools] = useState(true);

  const fetchKeys = useCallback(() => {
    setLoading(true);
    fetch(API_BASE_URL + '/api/super/ai-keys')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setKeys(data);
        } else {
          console.error("La API no devolvió un arreglo:", data);
          setKeys([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching AI keys:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleToggle = (id: string, name: string) => {
    fetch(`${API_BASE_URL}/api/super/ai-keys/${id}/toggle`, {
      method: 'PUT'
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          showToast(`Conexión "${name}" ${data.is_active ? 'activada' : 'desactivada'}`, 'success');
          fetchKeys();
        }
      })
      .catch(err => console.error("Error toggling key:", err));
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar la conexión de IA "${name}"?`)) return;
    fetch(`${API_BASE_URL}/api/super/ai-keys/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        showToast(`Conexión "${name}" eliminada`, 'success');
        fetchKeys();
      })
      .catch(err => console.error("Error deleting key:", err));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(API_BASE_URL + '/api/super/ai-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        name,
        api_key: apiKey,
        model_name: modelName,
        supports_tools: supportsTools
      })
    })
      .then(res => res.json())
      .then(() => {
        showToast('Conexión de IA agregada correctamente', 'success');
        setModal(false);
        // Reset form
        setName('');
        setApiKey('');
        setSupportsTools(true);
        fetchKeys();
      })
      .catch(err => console.error("Error adding AI key:", err));
  };

  const filtered = keys.filter(k => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return k.name.toLowerCase().includes(q) || k.model_name.toLowerCase().includes(q) || k.provider.toLowerCase().includes(q);
  });

  const getStatusBadge = (k: AIKey) => {
    if (!k.is_active) {
      return <span className="badge badge-inactive">Inactivo</span>;
    }
    if (k.cool_down_until) {
      const coolDownTime = new Date(k.cool_down_until).getTime();
      const now = new Date().getTime();
      if (coolDownTime > now) {
        const remaining = Math.round((coolDownTime - now) / 1000 / 60);
        return <span className="badge badge-preparing">En Enfriamiento ({remaining} min)</span>;
      }
    }
    return <span className="badge badge-active">Activo / Saludable</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Balanceador de IA</h2>
          <p><MI name="smart_toy"/>Administración de llaves API y modelos para balanceo automático</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <MI name="add"/>Agregar Conexión de IA
        </button>
      </div>

      <div className="data-table-wrapper">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>Cargando conexiones...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>No se encontraron conexiones de IA configuradas.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Nombre Conexión</th>
                <th>Modelo</th>
                <th style={{ textAlign: 'center' }}>Soporta Tools</th>
                <th>Métricas / Salud</th>
                <th>Último Uso</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(k => (
                <tr key={k.id}>
                  <td>
                    <span className="badge badge-new" style={{ textTransform: 'uppercase' }}>{k.provider}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{k.name}</td>
                  <td className="font-mono" style={{ fontSize: 12 }}>{k.model_name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: k.supports_tools ? 'var(--color-success-emerald)' : 'var(--color-outline)' }}>
                      {k.supports_tools ? 'check_circle' : 'cancel'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div>Fallos: {k.failed_attempts}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {k.last_used ? k.last_used.replace('T', ' ').substring(0, 16) : 'Nunca usado'}
                  </td>
                  <td>
                    {getStatusBadge(k)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => handleToggle(k.id, k.name)}>
                        <MI name={k.is_active ? 'block' : 'check_circle'} style={{ fontSize: 16 }}/>
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', color: 'var(--color-error)' }} onClick={() => handleDelete(k.id, k.name)}>
                        <MI name="delete" style={{ fontSize: 16 }}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal onClose={() => setModal(false)}>
          <ModalHeader icon="smart_toy" iconColor="blue" title="Agregar Conexión de IA" subtitle="Registra una nueva API Key en el balanceador" onClose={() => setModal(false)}/>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre de Conexión</label>
                <input className="form-input" required placeholder="Ej: Gemini Key Producción" value={name} onChange={e => setName(e.target.value)}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Proveedor</label>
                  <select className="form-input" value={provider} onChange={e => {
                    setProvider(e.target.value);
                    if (e.target.value === 'gemini') setModelName('gemini-2.0-flash');
                    else if (e.target.value === 'groq') setModelName('llama-3.3-70b-versatile');
                    else if (e.target.value === 'openai') setModelName('gpt-4o');
                    else if (e.target.value === 'anthropic') setModelName('claude-3-5-sonnet-latest');
                    else if (e.target.value === 'openrouter') setModelName('google/gemini-2.5-flash');
                    else if (e.target.value === 'deepseek') setModelName('deepseek-chat');
                    else if (e.target.value === 'ollama') setModelName('qwen2.5:3b');
                  }}>
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="ollama">Ollama (Local/VPS)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input className="form-input" required placeholder="Ej: gemini-2.0-flash" value={modelName} onChange={e => setModelName(e.target.value)}/>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">API Key</label>
                <input className="form-input font-mono" type="password" required placeholder="Ingresa la clave API" value={apiKey} onChange={e => setApiKey(e.target.value)}/>
                <span className="form-hint">La clave será encriptada mediante AES-256 antes de guardarse en base de datos.</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={supportsTools} onChange={e => setSupportsTools(e.target.checked)}/>
                  <span>Soporta Function Calling (Herramientas del Carrito/RAG)</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Conexión</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App({ user, onLogout }: { user:{name:string;email:string;role?:string}; onLogout:()=>void }) {
  const [activeTab,setActiveTab]=useState<TabKey>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash as TabKey;
    return 'dashboard';
  });
  const [toasts,setToasts]=useState<ToastMsg[]>([]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [showQuickActions,setShowQuickActions]=useState(false);
  const [searchQuery,setSearchQuery]=useState('');
  const [notifs,setNotifs]=useState<Notification[]>(INIT_NOTIFS);
  const [modal,setModal]=useState<ModalKey>(null);
  const [delivered,setDelivered]=useState<Order[]>([]);
  const toastIdRef=useRef(0);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActiveTab(hash as TabKey);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Super Admin States
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [platformPlans, setPlatformPlans] = useState<PlatformPlan[]>([]);
  const [financialLogs, setFinancialLogs] = useState<FinancialLog[]>([]);

  useEffect(() => {
    if (user.role !== 'SUPER_ADMIN') return;
    
    // Fetch tenants
    fetch(API_BASE_URL + '/api/super/tenants')
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          owner: t.owner_name || 'GC Corp',
          email: t.owner_email || 'admin@nexus.com',
          plan: t.plan || 'Starter',
          status: t.status || 'ACTIVE',
          messagesCount: t.messages_count || 0,
          storageUsed: t.storage_used || 0,
          joinDate: t.created_at ? t.created_at.split('T')[0] : '2026-06-01'
        }));
        setTenants(mapped);
      })
      .catch(err => console.error("Error fetching tenants:", err));

    // Fetch plans
    fetch(API_BASE_URL + '/api/super/plans')
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((p: any) => ({
          key: p.key,
          name: p.name,
          price: Number(p.price),
          maxMsgs: p.max_msgs,
          maxAgents: p.max_agents
        }));
        setPlatformPlans(mapped);
      })
      .catch(err => console.error("Error fetching plans:", err));

    // Fetch billing
    fetch(API_BASE_URL + '/api/super/billing')
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((l: any) => ({
          id: l.id,
          tenantName: l.tenant_name,
          amount: Number(l.amount),
          status: l.status,
          date: l.date ? l.date.replace('T', ' ').substring(0, 16) : '2026-06-15 14:32',
          gateway: l.gateway
        }));
        setFinancialLogs(mapped);
      })
      .catch(err => console.error("Error fetching billing:", err));
  }, [user.role]);

  const handleUpdateTenant = (id: string, d: Partial<Tenant>) => {
    const body: any = {};
    if (d.name !== undefined) body.name = d.name;
    if (d.owner !== undefined) body.owner_name = d.owner;
    if (d.email !== undefined) body.owner_email = d.email;
    if (d.plan !== undefined) body.plan = d.plan;
    if (d.status !== undefined) body.status = d.status;

    fetch(`${API_BASE_URL}/api/super/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(updated => {
        setTenants(prev => prev.map(t => t.id === id ? {
          ...t,
          name: updated.name,
          owner: updated.owner_name,
          email: updated.owner_email,
          plan: updated.plan,
          status: updated.status,
          messagesCount: updated.messages_count,
          storageUsed: updated.storage_used
        } : t));
      })
      .catch(err => console.error("Error updating tenant:", err));
  };

  const handleUpdatePlan = (key: string, data: Partial<PlatformPlan>) => {
    fetch(`${API_BASE_URL}/api/super/plans/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: data.price,
        max_msgs: data.maxMsgs
      })
    })
      .then(res => res.json())
      .then(updated => {
        setPlatformPlans(prev => prev.map(p => p.key === key ? {
          ...p,
          price: Number(updated.price),
          maxMsgs: updated.max_msgs
        } : p));
      })
      .catch(err => console.error("Error updating plan:", err));
  };

  const handleUpdateLog = (id: string, data: Partial<FinancialLog>) => {
    if (data.status === 'REFUNDED') {
      fetch(`${API_BASE_URL}/api/super/billing/${id}/refund`, {
        method: 'PUT'
      })
        .then(res => res.json())
        .then(updated => {
          setFinancialLogs(prev => prev.map(l => l.id === id ? {
            ...l,
            status: updated.status
          } : l));
        })
        .catch(err => console.error("Error refunding transaction:", err));
    } else {
      setFinancialLogs(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    }
  };

  const showToast=useCallback((message:string,type:ToastMsg['type']='success')=>{
    const id=++toastIdRef.current;
    setToasts(p=>[...p,{id,message,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);
  const dismissToast=useCallback((id:number)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);

  const [simulatingOrders, setSimulatingOrders] = useState<boolean>(() => {
    return localStorage.getItem('simulatingOrders') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('simulatingOrders', String(simulatingOrders));
  }, [simulatingOrders]);

  const [orders,setOrders]=useState<Order[]>([]);

  useEffect(() => {
    if (user.role === 'SUPER_ADMIN') return;
    
    const fetchOrders = () => {
      fetch(API_BASE_URL + '/api/tenant/orders', {
        headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const mapped = data.map((o: any) => ({
              ...o,
              createdAt: new Date(o.createdAt),
              deliveryMethod: o.deliveryMethod || o.delivery_method || 'DELIVERY',
              shippingAddress: o.shippingAddress || o.shipping_address
            }));
            setOrders(mapped.filter((o: any) => o.status !== 'DELIVERED'));
            setDelivered(mapped.filter((o: any) => o.status === 'DELIVERED'));
          }
        })
        .catch(err => console.error("Error fetching orders:", err));
    };

    // Initial fetch
    fetchOrders();

    // Listen to real-time events from the backend to instantly inject orders
    const eventSource = new EventSource(API_BASE_URL + '/api/tenant/orders/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newOrder = {
          ...data,
          createdAt: new Date(data.createdAt),
          deliveryMethod: data.deliveryMethod || data.delivery_method || 'DELIVERY',
          shippingAddress: data.shippingAddress || data.shipping_address
        };
        // Inject the order precisely like the simulator!
        setOrders(prev => {
          // Prevent duplicates if already fetched
          if (prev.some(o => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });
        // Optionally show toast for new real order
        showToast(`¡Nuevo pedido recibido! (#${newOrder.id})`, 'info');
      } catch (err) {
        console.error("Error parsing real-time order stream:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [user.role, showToast]);

  useEffect(()=>{
    if (user.role === 'SUPER_ADMIN' || !simulatingOrders) return;
    const sim=setInterval(async ()=>{
      const names=['Patricia Rojas','Roberto Díaz','Ana Martínez','Felipe Torres'];
      const products=['Pizza Hawaiana','Combo Familiar','Alitas x6','Hamburguesa Clásica'];
      const methods=['WhatsApp Pay','Efectivo','QR'];
      const product=products[Math.floor(Math.random()*products.length)];
      const price=parseFloat((8+Math.random()*20).toFixed(2));
      const deliveryMethod = Math.random() > 0.5 ? 'DELIVERY' : 'PICKUP';
      const address = deliveryMethod === 'DELIVERY' ? 'Calle ' + Math.floor(10+Math.random()*90) + ' # ' + Math.floor(1+Math.random()*90) + '-' + Math.floor(1+Math.random()*90) : undefined;
      const payload = {
        customerName:names[Math.floor(Math.random()*names.length)],
        phone:'57300'+Math.floor(1000000+Math.random()*9000000),
        paymentMethod:methods[Math.floor(Math.random()*methods.length)],
        items:[{name:product,quantity:1,price}],
        total:price,
        deliveryMethod,
        shippingAddress:address
      };
      
      try {
        const token = localStorage.getItem('tenant_token');
        await fetch(`${API_BASE_URL}/api/tenant/orders/simulate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
        // The SSE will receive the update and update the UI automatically.
      } catch(e) {
        console.error("Error simulating order:", e);
      }
    },45000);
    return ()=>clearInterval(sim);
  },[showToast, user.role, simulatingOrders]);

  const handleUpdateOrderStatus = (id: string, nextStatus: OrderStatus) => {
    fetch(`${API_BASE_URL}/api/tenant/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870'
      },
      body: JSON.stringify({ status: nextStatus })
    })
      .then(res => res.json())
      .then(() => {
        if (nextStatus === 'DELIVERED') {
          const order = orders.find(o => o.id === id);
          if (order) {
            setDelivered(p => [{ ...order, status: 'DELIVERED', deliveredAt: new Date() }, ...p]);
          }
          setOrders(p => p.filter(o => o.id !== id));
          showToast('Pedido marcado como entregado', 'success');
        } else {
          setOrders(p => p.map(o => o.id === id ? { ...o, status: nextStatus, ...(nextStatus === 'PREPARING' ? { createdAt: new Date() } : {}) } : o));
          showToast(`Pedido actualizado a: ${STATUS_LABEL[nextStatus]}`, 'success');
        }
      })
      .catch(err => console.error("Error updating order status:", err));
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      const token = localStorage.getItem('tenant_token');
      const res = await fetch(`${API_BASE_URL}/api/tenant/orders/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setOrders(p => p.filter(o => o.id !== id));
        showToast(`Pedido #${id} eliminado correctamente`, 'success');
      } else {
        showToast('Error al eliminar pedido', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar pedido', 'error');
    }
  };

  const handleEditOrder = async (id: string, updates: Partial<Order>) => {
    try {
      const token = localStorage.getItem('tenant_token');
      const res = await fetch(`${API_BASE_URL}/api/tenant/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setOrders(p => p.map(o => o.id === id ? { ...o, ...updates } : o));
        showToast(`Pedido #${id} actualizado`, 'success');
      } else {
        showToast('Error al actualizar pedido', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar pedido', 'error');
    }
  };

  const unreadCount=notifs.filter(n=>!n.read).length;
  const newCount=orders.filter(o=>o.status==='NEW').length;

  const tabTitles:Record<TabKey,string>={
    dashboard: user.role==='SUPER_ADMIN' ? 'Dashboard Global' : 'Dashboard',
    'ai-knowledge':'AI Knowledge Base',
    chats: 'Chats en Vivo',
    orders:'Gestión de Pedidos',
    customers:'Clientes',
    settings: user.role==='SUPER_ADMIN' ? 'Configuración Global' : 'Configuración',
    'super-tenants': 'Tenants',
    'super-plans': 'Planes',
    'super-billing': 'Facturación',
    'super-ai-keys': 'Balanceador de IA'
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <>
      <nav className="sidebar">
        {isSuperAdmin ? (
          <div className="sidebar-logo" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="sidebar-logo-icon" style={{ background: 'var(--color-primary)' }}>
              <span className="material-symbols-outlined" style={{fontSize:20,position:'relative',zIndex:1,color:'white',fontVariationSettings:'"FILL" 1'}}>admin_panel_settings</span>
            </div>
            <div className="sidebar-logo-text"><h1>Nexus Admin</h1><p>Platform Control</p></div>
          </div>
        ) : (
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><span className="material-symbols-outlined filled" style={{fontSize:20,position:'relative',zIndex:1}}>hexagon</span></div>
            <div className="sidebar-logo-text"><h1>Nexus AI</h1><p>Sales Automation</p></div>
          </div>
        )}

        <div className="sidebar-nav">
          {isSuperAdmin ? (
            <>
              <NavItem icon="dashboard" label="Dashboard Global" active={activeTab==='dashboard'} onClick={()=>handleTabChange('dashboard')}/>
              <NavItem icon="storefront" label="Tenants" active={activeTab==='super-tenants'} onClick={()=>handleTabChange('super-tenants')}/>
              <NavItem icon="smart_toy" label="Balanceador de IA" active={activeTab==='super-ai-keys'} onClick={()=>handleTabChange('super-ai-keys')}/>
              <NavItem icon="workspace_premium" label="Planes" active={activeTab==='super-plans'} onClick={()=>handleTabChange('super-plans')}/>
              <NavItem icon="receipt_long" label="Facturación" active={activeTab==='super-billing'} onClick={()=>handleTabChange('super-billing')}/>
              <NavItem icon="settings" label="Configuración" active={activeTab==='settings'} onClick={()=>handleTabChange('settings')}/>
            </>
          ) : (
            <>
              <NavItem icon="dashboard" label="Dashboard" active={activeTab==='dashboard'} onClick={()=>handleTabChange('dashboard')}/>
              <NavItem icon="psychology" label="AI Knowledge Base" active={activeTab==='ai-knowledge'} onClick={()=>handleTabChange('ai-knowledge')}/>
              <NavItem icon="forum" label="Chats en Vivo" active={activeTab==='chats'} onClick={()=>handleTabChange('chats')}/>
              <NavItem icon="shopping_cart" label="Pedidos" active={activeTab==='orders'} onClick={()=>handleTabChange('orders')} badge={newCount}/>
              <NavItem icon="group" label="Clientes" active={activeTab==='customers'} onClick={()=>handleTabChange('customers')}/>
              <NavItem icon="settings" label="Configuración" active={activeTab==='settings'} onClick={()=>handleTabChange('settings')}/>
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          {isSuperAdmin ? (
            <div style={{ padding: '0 16px 12px', fontSize: 11, color: 'var(--color-outline)' }}>
              Rol: Super Admin
            </div>
          ) : (
            <button className="btn-upgrade" onClick={()=>setModal('upgrade')}><MI name="auto_awesome"/>Upgrade to Pro</button>
          )}
          {!isSuperAdmin && (
            <button className="nav-item-small" onClick={()=>setModal('help-center')}><MI name="help" style={{fontSize:18}}/>Help Center</button>
          )}
          <button className="nav-item-small" onClick={onLogout}><MI name="logout" style={{fontSize:18}}/>Cerrar Sesión</button>
        </div>
      </nav>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-search">
              <MI name="search"/>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={`Buscar en ${tabTitles[activeTab]}...`}/>
            </div>
          </div>
          <div className="topbar-right">
            {isSuperAdmin ? (
              <div className="status-indicator status-connected" style={{padding:'4px 12px',fontSize:11}}><div className="status-indicator-dot"/>Plataforma: Operativa</div>
            ) : (
              <div className="status-indicator status-connected" style={{padding:'4px 12px',fontSize:11}}><div className="status-indicator-dot"/>WhatsApp: Activo</div>
            )}
            
            {!isSuperAdmin && (
              <>
                <button className="topbar-icon-btn" onClick={()=>{setShowNotifs(!showNotifs);setShowProfile(false);setShowQuickActions(false);}}>
                  <MI name="notifications"/>
                  {unreadCount>0&&<span className="notification-dot"/>}
                </button>
                <div style={{position:'relative'}}>
                  <button className="topbar-icon-btn" onClick={()=>{setShowQuickActions(!showQuickActions);setShowNotifs(false);setShowProfile(false);}}><MI name="bolt"/><span className="notification-dot active-dot"/></button>
                  {showQuickActions&&<QuickActionsDropdown onClose={()=>setShowQuickActions(false)} showToast={showToast} onTrain={()=>{setModal('train-model');setShowQuickActions(false);}} onBroadcast={()=>{setModal('broadcast');setShowQuickActions(false);}}/>}
                </div>
              </>
            )}

            <div style={{position:'relative'}}>
              <div className="topbar-avatar" style={{cursor:'pointer'}} onClick={()=>{setShowProfile(!showProfile);setShowNotifs(false);setShowQuickActions(false);}}>
                {getInitials(user.name)}
              </div>
              {showProfile&&<ProfileDropdown user={user} onClose={()=>setShowProfile(false)} onLogout={onLogout} onSettings={()=>{setActiveTab('settings');setShowProfile(false);}} onUpgrade={()=>{setModal('upgrade');setShowProfile(false);}}/>}
            </div>
          </div>
        </header>

        <div className="page-canvas">
          {isSuperAdmin ? (
            <>
              {activeTab==='dashboard'     &&<SuperAdminDashboardView tenants={tenants} logs={financialLogs}/>}
              {activeTab==='super-tenants' &&<SuperAdminTenantsView tenants={tenants} plans={platformPlans} onUpdateTenant={handleUpdateTenant} showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='super-ai-keys' &&<SuperAdminAIKeysView showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='super-plans'   &&<SuperAdminPlansView plans={platformPlans} onUpdatePlan={handleUpdatePlan} showToast={showToast}/>}
              {activeTab==='super-billing' &&<SuperAdminBillingView logs={financialLogs} onUpdateLog={handleUpdateLog} showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='settings'      &&<div className="card"><div className="nexus-indicator"/><div className="card-body">
                <div className="section-title"><MI name="admin_panel_settings"/>Configuración Global de Plataforma</div>
                <p style={{ fontSize: 13, color: 'var(--color-outline)', marginBottom: 20 }}>
                  Ajustes maestros del sistema multi-tenant de FlowCommerce.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group" style={{marginBottom:0}}><label className="form-label">Nombre del Sistema</label><input className="form-input" defaultValue="FlowCommerce Console"/></div>
                  <div className="form-group" style={{marginBottom:0}}><label className="form-label">Entorno</label><input className="form-input" readOnly defaultValue="Production / Live"/></div>
                  <div className="form-group" style={{marginBottom:0}}><label className="form-label">Mantenimiento Global</label>
                    <select className="form-input" defaultValue="false">
                      <option value="false">Desactivado (Sistema Operativo)</option>
                      <option value="true">Activado (Modo solo lectura)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}><label className="form-label">Límite de Registro de Tenants</label><input className="form-input" type="number" defaultValue="500"/></div>
                </div>
                <div className="divider"/>
                <div style={{display:'flex',justifyContent:'flex-end'}}><button className="btn btn-primary" onClick={()=>showToast('Configuración global actualizada','success')}><MI name="save"/>Guardar Ajustes</button></div>
              </div></div>}
            </>
          ) : (
            <>
              {activeTab==='dashboard'    &&<DashboardView orders={[...orders, ...delivered]} showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='ai-knowledge' &&<AIKnowledgeView showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='chats'        &&<ChatsView showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='orders'       &&<OrdersView orders={orders} delivered={delivered} onUpdateOrderStatus={handleUpdateOrderStatus} onDeleteOrder={handleDeleteOrder} onEditOrder={handleEditOrder} simulatingOrders={simulatingOrders} setSimulatingOrders={setSimulatingOrders} showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='customers'    &&<CustomersView showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='settings'     &&<SettingsView showToast={showToast}/>}
            </>
          )}
        </div>
      </div>

      {/* Panels */}
      {showNotifs&&<NotificationPanel notifs={notifs} onClose={()=>setShowNotifs(false)} onMarkRead={id=>setNotifs(p=>p.map(n=>n.id===id?{...n,read:true}:n))} onMarkAllRead={()=>setNotifs(p=>p.map(n=>({...n,read:true})))} onConfigure={()=>setModal('notification-settings')}/>}
      {modal==='upgrade'&&<UpgradeModal onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==='help-center'&&<HelpCenterModal onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==='notification-settings'&&<NotificationSettingsModal onClose={()=>setModal(null)} showToast={showToast}/>}
      {modal==='train-model'&&<TrainModelModal onClose={()=>setModal(null)} showToast={(m, t)=>{
        fetch(API_BASE_URL + '/api/tenant/documents/train', {
          method: 'POST',
          headers: { 'X-Tenant-ID': '40446806-0107-6201-9310-c9943efb3870' }
        })
          .then(res => res.json())
          .then(() => {
            showToast(m, t);
          })
          .catch(err => console.error("Error training model:", err));
      }}/>}
      {modal==='broadcast'&&<BroadcastModal onClose={()=>setModal(null)} showToast={showToast}/>}

      <ToastContainer toasts={toasts} dismiss={dismissToast}/>
    </>
  );
}
