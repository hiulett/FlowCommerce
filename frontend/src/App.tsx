const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import InventoryView from './views/InventoryView';
import BillingView from './views/BillingView';

// ─── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'inventory' | 'ai-knowledge' | 'chats' | 'orders' | 'customers' | 'settings' | 'super-tenants' | 'super-plans' | 'super-billing' | 'super-ai-keys' | 'billing' | 'analytics' | 'conversations' | 'products';
type SettingsTab = 'business-profile' | 'team-management' | 'whatsapp-integration' | 'billing-security' | 'finance-settings';
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
  id: string; customerName: string; phone: string; uuid?: string;
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
  status: 'TRAINED' | 'PENDING' | 'TRAINING'; content?: string;
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
const STATUS_LABEL: Record<OrderStatus,string> = { NEW:'Nuevo',PREPARING:'Preparando',READY:'Listo',DELIVERED:'Entregado', CONFIRMED:'Confirmado', SHIPPED:'En Camino' };
const STATUS_BADGE: Record<OrderStatus,string> = { NEW:'badge-new',PREPARING:'badge-preparing',READY:'badge-ready',DELIVERED:'badge-delivered', CONFIRMED: 'badge-preparing', SHIPPED: 'badge-preparing' };

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

function PlaceholderView({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <MI name={icon} style={{ fontSize: 64, color: 'var(--color-outline-variant)' }} />
      <h2>{title}</h2>
      <p style={{ color: 'var(--color-on-surface-variant)' }}>{description}</p>
    </div>
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isThisWeek = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const isThisMonth = (date: Date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const filteredByDateOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    if (dateFilter === 'today') return isToday(d);
    if (dateFilter === 'week') return isThisWeek(d);
    if (dateFilter === 'month') return isThisMonth(d);
    return true;
  });

  const totalSales = filteredByDateOrders
    .filter(o => o.status !== 'DELIVERED')
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrdersCount = filteredByDateOrders.length;
  
  const uniqueCustomers = new Set(filteredByDateOrders.map(o => o.phone)).size;

  const totalChats = Math.max(Math.round(totalOrdersCount * 2.3), 12);

  const stats = [
    {label:'Ventas',value:`$${totalSales.toFixed(2)}`,icon:'payments',color:'indigo',change:dateFilter==='today'?'Hoy':dateFilter==='week'?'Esta semana':'Este mes',up:true},
    {label:'Pedidos',value:`${totalOrdersCount}`,icon:'shopping_cart',color:'blue',change:'Pedidos en periodo',up:true},
    {label:'Chats IA',value:`${totalChats}`,icon:'forum',color:'orange',change:'89% resueltos',up:true},
    {label:'Clientes',value:`${uniqueCustomers}`,icon:'group',color:'green',change:'Interactuando',up:true},
  ];

  const precisionPct = Math.min(98, Math.max(85, 90 + (totalOrdersCount % 5) - (orders.filter(o => o.status === 'DELIVERED').length)));
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
  const cancelled = orders.filter(o => o.status === 'NEW').length;
  const satisfactionPct = completed + cancelled > 0 ? Math.min(99, Math.max(80, Math.round((completed / (completed + cancelled * 1.8 || 1)) * 100))) : 96;
  const timePct = Math.min(100, Math.max(10, Math.round(((30 - avgDispatchTime) / 25) * 100)));

  let barValues: number[] = [];
  let barLabels: string[] = [];

  if (dateFilter === 'today') {
    const blocks = [
      { label: 'Almuerzo (12-15h)', start: 12, end: 15, sales: 0 },
      { label: 'Tarde (15-18h)', start: 15, end: 18, sales: 0 },
      { label: 'Cena (18-21h)', start: 18, end: 21, sales: 0 },
      { label: 'Noche (21-24h)', start: 21, end: 24, sales: 0 },
    ];
    
    filteredByDateOrders.forEach(o => {
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
          blocks[0].sales += o.total;
        } else {
          blocks[3].sales += o.total;
        }
      }
    });

    barValues = blocks.map(b => b.sales);
    barLabels = ['Almuerzo', 'Tarde', 'Cena', 'Noche'];
  } else if (dateFilter === 'week') {
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
      const oDateStr = new Date(o.createdAt).toDateString();
      const matchedDay = days.find(day => day.dateStr === oDateStr);
      if (matchedDay) {
        matchedDay.sales += o.total;
      }
    });

    barValues = days.map(d => d.sales);
    barLabels = days.map(d => d.label);
  } else {
    const weeks = [
      { label: 'Semana 1', startDay: 1, endDay: 7, sales: 0 },
      { label: 'Semana 2', startDay: 8, endDay: 14, sales: 0 },
      { label: 'Semana 3', startDay: 15, endDay: 21, sales: 0 },
      { label: 'Semana 4', startDay: 22, endDay: 31, sales: 0 },
    ];

    filteredByDateOrders.forEach(o => {
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

  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredOrders = sortedOrders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.customerName.toLowerCase().includes(q) ||
           o.id.includes(q) ||
           o.items.some(it => it.name.toLowerCase().includes(q));
  });

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
function AIKnowledgeView({ showToast, searchQuery, onNavigateToInventory }: { showToast:(m:string,t?:ToastMsg['type'])=>void; searchQuery:string, onNavigateToInventory: () => void }) {
  const [docs,setDocs]=useState<KBDocument[]>(INIT_KB);
  const [modal,setModal]=useState<'upload'|'edit'|'delete'|'train'|null>(null);
  const [selected,setSelected]=useState<KBDocument|null>(null);
  const [systemPrompt,setSystemPrompt]=useState('');
  const [businessRules, setBusinessRules] = useState('');
  const [salesTechniques, setSalesTechniques] = useState('');
  const typeColors:Record<KBDocument['type'],string>={FAQ:'badge-new',CATALOG:'badge-active',POLICY:'badge-delivered',PROMO:'badge-preparing',SALES_TECHNIQUE:'badge-active'};
  const isTraining = docs.some(d => d.status === 'TRAINING');

  const handleSaveSettings = () => { showToast('Configuración del Banco de Información guardada', 'success'); };
  const handleDeleteDoc = () => { setDocs(prev => prev.filter(d => d.id !== selected?.id)); setModal(null); };

  const filteredDocs = docs.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || (d.content && d.content.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title"><h2>AI Knowledge Base</h2><p><MI name="psychology"/>Base de conocimiento del asistente IA de WhatsApp</p></div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={()=>{setSelected(null);setModal('upload');}} disabled={isTraining}><MI name="auto_awesome"/>Extraer Catálogo desde Texto</button>
          <button className="btn btn-secondary" onClick={()=>setModal('train')} disabled={isTraining}>Entrenar Modelo</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div className="card"><div className="nexus-indicator"/><div className="card-body">
            <div className="section-title"><MI name="gavel"/>Reglas del Negocio</div>
            <textarea className="form-input" rows={6} value={businessRules} onChange={e=>setBusinessRules(e.target.value)} placeholder="Ej: Atendemos de 8am a 10pm..."/>
            <button className="btn btn-outline" style={{width:'100%',marginTop:10}} onClick={handleSaveSettings}><MI name="save"/>Guardar Reglas</button>
          </div></div>
          <div className="card"><div className="nexus-indicator"/><div className="card-body">
            <div className="section-title"><MI name="record_voice_over"/>Técnicas de Venta</div>
            <textarea className="form-input" rows={6} value={salesTechniques} onChange={e=>setSalesTechniques(e.target.value)} placeholder="Ej: Sé amable, usa emojis..."/>
            <button className="btn btn-outline" style={{width:'100%',marginTop:10}} onClick={handleSaveSettings}><MI name="save"/>Guardar Técnicas</button>
          </div></div>
        </div>
        <div className="card"><div className="nexus-indicator"/><div className="card-body">
            <div className="section-title"><MI name="smart_toy"/>System Prompt</div>
            <textarea className="form-input" rows={12} value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)}/>
            <button className="btn btn-primary" style={{width:'100%',marginTop:10}} onClick={handleSaveSettings}><MI name="save"/>Guardar Prompt</button>
        </div></div>
      </div>
      <div className="card" style={{marginTop: 24}}>
        <div className="nexus-indicator"/>
        <div className="card-body">
          <table className="table" style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}>
            <thead><tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
            <tbody>{filteredDocs.map(d => (
              <tr key={d.id}>
                <td style={{padding:'12px',fontWeight:600}}>{d.title}</td>
                <td style={{padding:'12px'}}><span className={`badge ${typeColors[d.type]}`}>{KB_LABEL[d.type]}</span></td>
                <td style={{padding:'12px'}}>{d.lastUpdated}</td>
                <td style={{padding:'12px'}}><span className={`badge ${d.status === 'TRAINED' ? 'badge-delivered' : 'badge-new'}`}>{d.status}</span></td>
                <td style={{padding:'12px',textAlign:'right'}}>
                  <button className="btn btn-ghost" style={{padding:'4px'}} onClick={()=>{setSelected(d);setModal('edit');}}><MI name="edit"/></button>
                  <button className="btn btn-ghost" style={{padding:'4px',color:'var(--color-error)'}} onClick={()=>{setSelected(d);setModal('delete');}}><MI name="delete"/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {(modal==='upload'||modal==='edit')&&<DocumentModal onClose={()=>setModal(null)} onSave={()=>{showToast('Guardado','success');setModal(null);}}/>}
      {modal==='delete'&&selected&&<DeleteModal title="¿Eliminar?" description="¿Confirmar?" onClose={()=>setModal(null)} onConfirm={handleDeleteDoc}/>}
      {modal==='train'&&<TrainModelModal onClose={()=>setModal(null)} showToast={showToast}/>}
    </div>
  );
}

// ── Orders View ────────────────────────────────────────────────────────────────
function OrdersView({ orders, delivered, onUpdateOrderStatus, onDeleteOrder, onEditOrder, simulatingOrders, setSimulatingOrders, showToast, searchQuery }: { orders:Order[]; delivered:Order[]; onUpdateOrderStatus:(id:string,status:OrderStatus)=>void; onDeleteOrder:(id:string)=>void; onEditOrder:(id:string,updates:Partial<Order>)=>void; simulatingOrders:boolean; setSimulatingOrders:(v:boolean)=>void; showToast:(m:string,t?:ToastMsg['type'])=>void; searchQuery:string }) {
  const [view,setView]=useState<'kanban'|'table'|'history'>('kanban');
  const getMin=(d:Date)=>Math.floor((Date.now()-d.getTime())/60000);
  const filterBySearch = (o: Order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.customerName.toLowerCase().includes(q) || o.id.includes(q) || o.items.some(i => i.name.toLowerCase().includes(q));
  };
  const filteredOrders = orders.filter(filterBySearch);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title"><h2>Gestión de Pedidos</h2><p><MI name="chat"/>{orders.length} activos</p></div>
        <div className="page-header-actions">
          <button className={`btn ${view==='kanban'?'btn-primary':'btn-outline'}`} onClick={()=>setView('kanban')}><MI name="view_kanban"/>KDS</button>
          <button className={`btn ${view==='table'?'btn-primary':'btn-outline'}`} onClick={()=>setView('table')}><MI name="table_rows"/>Tabla</button>
        </div>
      </div>
      {view==='kanban' && (
        <div className="kds-board" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
          {(['NEW','CONFIRMED','PREPARING','READY','SHIPPED'] as OrderStatus[]).map(col => (
             <div key={col} className="kds-column">
               <h3>{col}</h3>
               {filteredOrders.filter(o => o.status === col).map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">#{order.id} - {order.customerName}</div>
                    <div className="order-products">{order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}</div>
                    <div style={{fontWeight:700,marginTop:10}}>${order.total.toFixed(2)}</div>
                  </div>
               ))}
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings View ──────────────────────────────────────────────────────────────
function SettingsView({ showToast }: { showToast:(m:string,t?:ToastMsg['type'])=>void }) {
  const [settingsTab,setSettingsTab]=useState<SettingsTab | 'finance-settings'>('business-profile');
  const [taxActive, setTaxActive] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(0);
  const [businessRules,setBusinessRules] = useState('');
  const [salesTechniques,setSalesTechniques] = useState('');

  const handleSaveSettings = () => { showToast('Configuraciones guardadas','success'); };
  const handleSaveFinanceSettings = () => { showToast('Configuraciones financieras guardadas','success'); };
  const handleSaveWaSettings = () => { showToast('Configuración de WhatsApp guardada','success'); };

  const tabs=[
    {key:'business-profile' as SettingsTab,label:'Perfil del Negocio',icon:'storefront'},
    {key:'team-management' as SettingsTab,label:'Gestión de Equipo',icon:'groups'},
    {key:'whatsapp-integration' as SettingsTab,label:'WhatsApp & IA',icon:'chat'},
    {key:'finance-settings' as any,label:'Finanzas e Impuestos',icon:'request_quote'},
    {key:'billing-security' as SettingsTab,label:'Seguridad',icon:'security'}
  ];

  return (
    <div>
      <div className="settings-layout">
        <div className="settings-sidebar">
          {tabs.map(t=><button key={t.key} className={`settings-nav-item${settingsTab===t.key?' active':''}`} onClick={()=>setSettingsTab(t.key)}><MI name={t.icon}/>{t.label}</button>)}
        </div>
        <div className="settings-content">
          {settingsTab==='whatsapp-integration' && (
            <div style={{display:'flex',flexDirection:'column',gap:20,animation:'fadeIn 0.3s'}}>
              <h3><MI name="chat"/> Integración con WhatsApp e IA</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                <div className="card" style={{padding:20}}>
                  <h4>Credenciales de Meta</h4>
                  <div style={{display:'flex',flexDirection:'column',gap:15,marginTop:15}}>
                    <div className="input-group">
                      <label>Phone Number ID</label>
                      <input className="input" type="text" placeholder="Ej: 123456789012345"/>
                    </div>
                    <div className="input-group">
                      <label>Access Token (Permanent)</label>
                      <input className="input" type="password" placeholder="EAAB..."/>
                    </div>
                  </div>
                </div>
                <div className="card" style={{padding:20}}>
                  <h4>Configuración de la IA</h4>
                  <div style={{display:'flex',flexDirection:'column',gap:15,marginTop:15}}>
                    <div className="input-group">
                      <label>Modelo (OpenAI / Anthropic)</label>
                      <select className="input">
                        <option>gpt-4o</option>
                        <option>gpt-4o-mini</option>
                        <option>claude-3.5-sonnet</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Temperatura (Creatividad)</label>
                      <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" style={{width:'100%'}}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {settingsTab==='finance-settings' && (
            <div style={{display:'flex',flexDirection:'column',gap:20,animation:'fadeIn 0.3s'}}>
              <h3><MI name="request_quote"/> Configuraciones Financieras</h3>
              <div className="card" style={{padding:20, display:'flex',flexDirection:'column',gap:15}}>
                <div className="input-group" style={{flexDirection:'row', alignItems:'center', gap:10}}>
                  <input type="checkbox" checked={taxActive} onChange={(e) => setTaxActive(e.target.checked)} style={{width:'20px', height:'20px'}}/>
                  <label style={{marginBottom:0}}>Activar cálculo de impuestos</label>
                </div>
                <div className="input-group">
                  <label>Porcentaje de Impuesto (%)</label>
                  <input className="input" type="number" step="0.01" value={taxPercentage} onChange={e=>setTaxPercentage(parseFloat(e.target.value))}/>
                </div>
                <div className="input-group">
                  <label>Costo Base de Delivery ($)</label>
                  <input className="input" type="number" step="0.01" value={baseDeliveryFee} onChange={e=>setBaseDeliveryFee(parseFloat(e.target.value))}/>
                </div>
                <button className="btn btn-primary" style={{alignSelf:'flex-start', marginTop:10}} onClick={handleSaveFinanceSettings}><MI name="save"/>Guardar Finanzas</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderView({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <MI name={icon} style={{ fontSize: 64, color: 'var(--color-outline-variant)' }} />
      <h2>{title}</h2>
      <p style={{ color: 'var(--color-on-surface-variant)' }}>{description}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App({ user, onLogout }: { user:{name:string;email:string;role?:string}; onLogout:()=>void }) {
  const [activeTab,setActiveTab]=useState<TabKey>('dashboard');
  const [toasts,setToasts]=useState<ToastMsg[]>([]);
  const [searchQuery,setSearchQuery]=useState('');
  const [orders,setOrders]=useState<Order[]>([]);
  const [delivered,setDelivered]=useState<Order[]>([]);

  const showToast=useCallback((message:string,type:ToastMsg['type']='success')=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,message,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  },[]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'conversations', label: 'Conversaciones', icon: 'chat' },
    { id: 'orders', label: 'Pedidos', icon: 'shopping_bag' },
    { id: 'products', label: 'Productos', icon: 'inventory_2' },
    { id: 'billing', label: 'Facturación', icon: 'receipt_long' },
    { id: 'customers', label: 'Clientes', icon: 'people' },
    { id: 'analytics', label: 'Analíticas', icon: 'analytics' },
    { id: 'settings', label: 'Configuración', icon: 'settings' }
  ];

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-logo">Nexus AI</div>
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id as TabKey)}>
            <MI name={item.icon}/> {item.label}
          </button>
        ))}
      </nav>
      <div className="main-content">
        <header className="topbar">
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
              {activeTab==='inventory'    &&<InventoryView showToast={showToast} />}
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
