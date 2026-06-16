import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ChefHat, 
  ShoppingBag, 
  Settings as SettingsIcon, 
  Clock, 
  Plus, 
  AlertTriangle, 
  MessageSquare,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';

// Interfaces de datos
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  total: number;
  createdAt: Date;
  status: 'NEW' | 'PREPARING' | 'READY';
  notes?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kds' | 'catalog' | 'settings'>('kds');
  
  // Catálogo mock inicial
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Pizza Familiar Pepperoni', category: 'Pizzas', price: 14.99, stock: 15 },
    { id: '2', name: 'Hamburguesa Nexus doble queso', category: 'Hamburguesas', price: 9.50, stock: 24 },
    { id: '3', name: 'Alitas BBQ x12', category: 'Entradas', price: 11.00, stock: 18 },
    { id: '4', name: 'Gaseosa Coca-Cola 2L', category: 'Bebidas', price: 3.50, stock: 50 },
    { id: '5', name: 'Papas fritas grandes', category: 'Acompañamientos', price: 4.00, stock: 35 }
  ]);

  // Pedidos mock iniciales con fechas pasadas para forzar el disparo de alertas de KDS
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1042',
      customerName: 'Isaac Mendoza',
      phone: '573001234567',
      items: [
        { name: 'Pizza Familiar Pepperoni', quantity: 1, price: 14.99 },
        { name: 'Gaseosa Coca-Cola 2L', quantity: 1, price: 3.50 }
      ],
      total: 18.49,
      createdAt: new Date(Date.now() - 28 * 60 * 1000), // Hace 28 minutos (Alerta Roja)
      status: 'PREPARING',
      notes: 'Sin cebolla en la salsa de tomate. Alérgeno: Lácteos.'
    },
    {
      id: '1043',
      customerName: 'Laura Gómez',
      phone: '573129876543',
      items: [
        { name: 'Hamburguesa Nexus doble queso', quantity: 2, price: 9.50 },
        { name: 'Papas fritas grandes', quantity: 1, price: 4.00 }
      ],
      total: 23.00,
      createdAt: new Date(Date.now() - 17 * 60 * 1000), // Hace 17 minutos (Alerta Amarilla)
      status: 'PREPARING'
    },
    {
      id: '1044',
      customerName: 'Carlos Ruiz',
      phone: '573155554433',
      items: [
        { name: 'Alitas BBQ x12', quantity: 1, price: 11.00 }
      ],
      total: 11.00,
      createdAt: new Date(Date.now() - 3 * 60 * 1000), // Hace 3 minutos (Normal)
      status: 'NEW'
    }
  ]);

  // Configuración de la IA y WhatsApp
  const [settings, setSettings] = useState({
    phoneId: '109283746501928',
    verifyToken: 'flowcommerce_token_123',
    accessToken: 'EAAGb37...z9P2kd8s',
    systemPrompt: 'Eres un asistente virtual de ventas oficial para la Pizzería Nexus. Tu tono es entusiasta y alegre. Solo recomiendas productos del catálogo adjunto.'
  });

  // Temporizador en tiempo real para actualizar contadores en el KDS cada segundo
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulación de WebSockets (Pedidos entrantes de WhatsApp cada 45 segundos)
  useEffect(() => {
    const wsSim = setInterval(() => {
      const names = ['Sofía Silva', 'Andrés Medina', 'Patricia Rojas', 'Roberto Díaz'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const newId = Math.floor(1000 + Math.random() * 9000).toString();
      
      const newOrder: Order = {
        id: newId,
        customerName: randomName,
        phone: '573009998877',
        items: [{ name: randomProduct.name, quantity: 1, price: randomProduct.price }],
        total: randomProduct.price,
        createdAt: new Date(),
        status: 'NEW'
      };

      setOrders(prev => [...prev, newOrder]);
      
      // Emitir audio de alerta sonora
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tono alto
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        console.log("Audio API not allowed until user interaction");
      }
    }, 45000);

    return () => clearInterval(wsSim);
  }, [products]);

  // Manejadores de Estado del KDS
  const handleStartPreparing = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'PREPARING', createdAt: new Date() } : o));
  };

  const handleMarkAsReady = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'READY' } : o));
  };

  const handleDeliverOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId)); // Remueve del tablero KDS
  };

  // Helper para calcular tiempo transcurrido
  const getMinutesElapsed = (createdAt: Date) => {
    return Math.floor((Date.now() - createdAt.getTime()) / 60000);
  };

  return (
    <div className="flex min-h-screen bg-[#fcf8ff] text-[#1b1b21]">
      {/* Barra de Navegación Lateral (Sidebar) */}
      <aside className="w-72 bg-[#1a146b] text-white flex flex-col border-r border-[#312e81]/30">
        <div className="p-6 border-b border-[#312e81]">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-[#3b82f6]">⚡</span> Nexus AI
          </h1>
          <p className="text-[#9c9af4] text-xs font-semibold mt-1">OPERATIONS CONTROL</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'dashboard' ? 'bg-[#312e81] text-white border-l-4 border-[#3b82f6]' : 'text-[#c3c0ff] hover:bg-[#312e81]/50 hover:text-white'}`}
          >
            <LayoutDashboard size={20} /> Dashboard Ejecutivo
          </button>
          <button 
            onClick={() => setActiveTab('kds')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'kds' ? 'bg-[#312e81] text-white border-l-4 border-[#3b82f6]' : 'text-[#c3c0ff] hover:bg-[#312e81]/50 hover:text-white'}`}
          >
            <ChefHat size={20} /> Monitor KDS
            {orders.filter(o => o.status === 'NEW').length > 0 && (
              <span className="ml-auto bg-[#3b82f6] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {orders.filter(o => o.status === 'NEW').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'catalog' ? 'bg-[#312e81] text-white border-l-4 border-[#3b82f6]' : 'text-[#c3c0ff] hover:bg-[#312e81]/50 hover:text-white'}`}
          >
            <ShoppingBag size={20} /> Catálogo de Stock
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'settings' ? 'bg-[#312e81] text-white border-l-4 border-[#3b82f6]' : 'text-[#c3c0ff] hover:bg-[#312e81]/50 hover:text-white'}`}
          >
            <SettingsIcon size={20} /> Configuración IA
          </button>
        </nav>
        <div className="p-6 border-t border-[#312e81] text-center text-xs text-[#9c9af4]">
          <p>FlowCommerce Client Console</p>
          <p className="mt-1 font-semibold text-[#c3c0ff]">v1.0.0 (Production)</p>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="bg-white border-b border-[#e2e8f0] px-8 py-4 flex justify-between items-center shadow-sm">
          <h2 className="text-xl font-bold text-[#1a146b] capitalize">
            {activeTab === 'kds' ? 'Kitchen Display System (KDS)' : activeTab}
          </h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-semibold bg-[#ECFDF5] text-[#065F46] px-3 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-ping"></span>
              WhatsApp Webhook: Conectado
            </span>
          </div>
        </header>

        <div className="p-8 flex-1">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-[#e2dfff] text-[#1a146b] rounded-lg">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[#474651] font-medium">Ventas de Hoy</p>
                    <p className="text-2xl font-bold">$348.90</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-[#d8e2ff] text-[#0058be] rounded-lg">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[#474651] font-medium">Pedidos Totales</p>
                    <p className="text-2xl font-bold">18</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-[#ffdbc7] text-[#70380b] rounded-lg">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[#474651] font-medium">Chats IA Activos</p>
                    <p className="text-2xl font-bold">42</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-[#ECFDF5] text-[#065F46] rounded-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-[#474651] font-medium">Nuevos Clientes</p>
                    <p className="text-2xl font-bold">9</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
                  <h3 className="font-bold text-[#1a146b] mb-4 flex items-center gap-2">
                    <TrendingUp size={20} /> Rendimiento de Canal (Ventas por IA)
                  </h3>
                  <div className="h-64 flex items-end gap-6 border-b border-l border-[#e2e8f0] p-4">
                    <div className="w-full bg-[#1a146b] rounded-t-md" style={{ height: '35%' }}></div>
                    <div className="w-full bg-[#1a146b] rounded-t-md" style={{ height: '55%' }}></div>
                    <div className="w-full bg-[#1a146b] rounded-t-md" style={{ height: '85%' }}></div>
                    <div className="w-full bg-[#3b82f6] rounded-t-md" style={{ height: '95%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#474651] font-bold mt-2 px-4">
                    <span>Semana 1</span>
                    <span>Semana 2</span>
                    <span>Semana 3</span>
                    <span>Hoy (WhatsApp IA)</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
                  <h3 className="font-bold text-[#1a146b] mb-4">Métricas Operativas</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span>Precisión de la IA (Resueltos s/ agente)</span>
                        <span>89%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#10B981] h-full" style={{ width: '89%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span>Tasa de Conversión WhatsApp</span>
                        <span>24.5%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#3b82f6] h-full" style={{ width: '24.5%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span>Tiempo Medio de Despacho</span>
                        <span>12.4 min</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#312e81] h-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MONITOR KDS KANBAN */}
          {activeTab === 'kds' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
              {/* COLUMNA 1: NUEVOS */}
              <div className="bg-[#f0ecf4] p-4 rounded-xl flex flex-col h-full border border-[#c8c5d3]/40">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#c8c5d3]">
                  <h3 className="font-bold text-sm text-[#1a146b] tracking-wider uppercase">NUEVOS</h3>
                  <span className="bg-[#1a146b] text-white text-xs px-2.5 py-1 rounded-full font-bold">
                    {orders.filter(o => o.status === 'NEW').length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {orders.filter(o => o.status === 'NEW').map(order => {
                    const elapsed = getMinutesElapsed(order.createdAt);
                    return (
                      <div 
                        key={order.id} 
                        className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xl font-extrabold text-[#1a146b]">#{order.id}</span>
                            <p className="text-xs font-semibold text-[#474651] mt-0.5">{order.customerName}</p>
                          </div>
                          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Clock size={12} /> {elapsed} min
                          </span>
                        </div>
                        <div className="border-t border-dashed border-[#e2e8f0] pt-2">
                          <p className="text-xs font-bold text-[#312e81]/60 mb-1">PRODUCTOS</p>
                          <ul className="space-y-1">
                            {order.items.map((it, idx) => (
                              <li key={idx} className="text-sm font-extrabold text-slate-800">
                                {it.quantity}x {it.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          onClick={() => handleStartPreparing(order.id)}
                          className="w-full bg-[#3b82f6] text-white font-extrabold py-3.5 rounded-lg text-sm hover:bg-[#0058be] active:scale-95 transition"
                        >
                          INICIAR PREPARACIÓN
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMNA 2: EN PREPARACIÓN */}
              <div className="bg-[#f0ecf4] p-4 rounded-xl flex flex-col h-full border border-[#c8c5d3]/40">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#c8c5d3]">
                  <h3 className="font-bold text-sm text-[#1a146b] tracking-wider uppercase">EN PREPARACIÓN</h3>
                  <span className="bg-[#312e81] text-white text-xs px-2.5 py-1 rounded-full font-bold">
                    {orders.filter(o => o.status === 'PREPARING').length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {orders.filter(o => o.status === 'PREPARING').map(order => {
                    const elapsed = getMinutesElapsed(order.createdAt);
                    
                    // Lógica del semáforo/color de alerta KDS
                    let alertClass = "border-[#e2e8f0]";
                    let alertHeader = "";
                    
                    if (elapsed >= 25) {
                      alertClass = "border-[#ba1a1a] bg-[#ffdad6] animate-pulse";
                      alertHeader = "bg-[#ba1a1a] text-white text-xs px-2 py-1 rounded font-bold text-center flex items-center justify-center gap-1 mb-2";
                    } else if (elapsed >= 15) {
                      alertClass = "border-amber-400 bg-amber-50/50 border-2";
                    }

                    return (
                      <div 
                        key={order.id} 
                        className={`p-5 rounded-xl border shadow-sm flex flex-col gap-3 transition-colors duration-300 ${alertClass}`}
                      >
                        {elapsed >= 25 && (
                          <div className={alertHeader}>
                            <AlertTriangle size={14} /> DEMORA CRÍTICA (+25 min)
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xl font-extrabold text-[#1a146b]">#{order.id}</span>
                            <p className="text-xs font-semibold text-[#474651] mt-0.5">{order.customerName}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                            elapsed >= 25 ? 'bg-[#ba1a1a] text-white' : 
                            elapsed >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Clock size={12} /> {elapsed} min
                          </span>
                        </div>
                        <div className="border-t border-dashed border-[#e2e8f0] pt-2">
                          <p className="text-xs font-bold text-[#312e81]/60 mb-1">PRODUCTOS</p>
                          <ul className="space-y-1">
                            {order.items.map((it, idx) => (
                              <li key={idx} className="text-sm font-extrabold text-slate-800">
                                {it.quantity}x {it.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {order.notes && (
                          <div className="bg-[#fcf8ff] p-2.5 rounded border border-[#e2e8f0] text-xs">
                            <span className="font-extrabold text-[#ba1a1a]">🤖 NOTA DE IA:</span> {order.notes}
                          </div>
                        )}
                        <button 
                          onClick={() => handleMarkAsReady(order.id)}
                          className="w-full bg-[#10B981] text-white font-extrabold py-3.5 rounded-lg text-sm hover:bg-[#059669] active:scale-95 transition"
                        >
                          MARCAR COMO LISTO
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMNA 3: LISTOS */}
              <div className="bg-[#f0ecf4] p-4 rounded-xl flex flex-col h-full border border-[#c8c5d3]/40">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#c8c5d3]">
                  <h3 className="font-bold text-sm text-[#1a146b] tracking-wider uppercase">LISTOS (DESPACHO)</h3>
                  <span className="bg-[#10B981] text-white text-xs px-2.5 py-1 rounded-full font-bold">
                    {orders.filter(o => o.status === 'READY').length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {orders.filter(o => o.status === 'READY').map(order => {
                    return (
                      <div 
                        key={order.id} 
                        className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xl font-extrabold text-[#1a146b]">#{order.id}</span>
                            <p className="text-xs font-semibold text-[#474651] mt-0.5">{order.customerName}</p>
                          </div>
                          <span className="text-xs font-bold bg-[#ECFDF5] text-[#065F46] px-2.5 py-1 rounded-full">
                            Completado
                          </span>
                        </div>
                        <div className="border-t border-dashed border-[#e2e8f0] pt-2">
                          <p className="text-xs font-bold text-[#312e81]/60 mb-1">PRODUCTOS</p>
                          <ul className="space-y-1 text-slate-500 line-through">
                            {order.items.map((it, idx) => (
                              <li key={idx} className="text-sm font-semibold">
                                {it.quantity}x {it.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button 
                          onClick={() => handleDeliverOrder(order.id)}
                          className="w-full bg-[#1a146b] text-white font-extrabold py-3.5 rounded-lg text-sm hover:bg-[#312e81] active:scale-95 transition"
                        >
                          MARCAR ENTREGADO
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATALOGO */}
          {activeTab === 'catalog' && (
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#1a146b]">Productos Registrados</h3>
                <button className="flex items-center gap-2 bg-[#3b82f6] text-white font-extrabold px-4 py-2.5 rounded-lg text-sm hover:bg-[#0058be] transition">
                  <Plus size={16} /> Agregar Producto
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-slate-50 text-xs font-bold uppercase text-[#474651]">
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4 text-right">Precio</th>
                      <th className="p-4 text-center">Stock</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] text-sm font-medium">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-800 font-extrabold">{p.name}</td>
                        <td className="p-4 text-[#474651]">{p.category}</td>
                        <td className="p-4 text-right text-slate-800 font-bold">${p.price.toFixed(2)}</td>
                        <td className="p-4 text-center font-bold">{p.stock} u</td>
                        <td className="p-4 text-center">
                          <span className="bg-[#ECFDF5] text-[#065F46] text-xs px-2.5 py-1 rounded-full font-bold">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURACION */}
          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm space-y-6 max-w-2xl">
              <h3 className="text-lg font-bold text-[#1a146b] border-b border-[#e2e8f0] pb-2">Configuración de Nexus AI</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#474651] uppercase mb-1">System Prompt de la IA</label>
                  <textarea 
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})}
                    rows={4}
                    className="w-full p-3 border border-[#e2e8f0] rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#3b82f6] outline-none"
                  />
                  <p className="text-xs text-[#474651] mt-1">Este prompt define la personalidad, contexto e instrucciones maestras del asistente de WhatsApp.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-[#474651] uppercase mb-1">WhatsApp Phone ID</label>
                    <input 
                      type="text" 
                      value={settings.phoneId}
                      onChange={(e) => setSettings({...settings, phoneId: e.target.value})}
                      className="w-full p-3 border border-[#e2e8f0] rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#3b82f6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-[#474651] uppercase mb-1">Webhook Verify Token</label>
                    <input 
                      type="text" 
                      value={settings.verifyToken}
                      onChange={(e) => setSettings({...settings, verifyToken: e.target.value})}
                      className="w-full p-3 border border-[#e2e8f0] rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#3b82f6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#474651] uppercase mb-1">Meta Access Token</label>
                  <input 
                    type="password" 
                    value={settings.accessToken}
                    onChange={(e) => setSettings({...settings, accessToken: e.target.value})}
                    className="w-full p-3 border border-[#e2e8f0] rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#3b82f6] outline-none"
                  />
                </div>

                <button className="w-full bg-[#1a146b] text-white font-extrabold py-3.5 rounded-lg text-sm hover:bg-[#312e81] active:scale-95 transition">
                  GUARDAR CONFIGURACIÓN
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
