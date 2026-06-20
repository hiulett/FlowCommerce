import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShoppingCart, Package, AlertTriangle, Search, Filter, Edit2, Check, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  knowledge_document_id?: string;
}

interface AnalyticsProduct extends Product {
  sold: number;
}

export default function InventoryView({ showToast }: { showToast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const [products, setProducts] = useState<AnalyticsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/tenant/analytics/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      showToast('Error cargando inventario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEditSave = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/tenant/products/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(editPrice), stock: parseInt(editStock, 10) })
      });
      if (res.ok) {
        showToast('Producto actualizado', 'success');
        setEditingId(null);
        fetchProducts();
      } else {
        showToast('Error al actualizar', 'error');
      }
    } catch (e) {
      showToast('Error de red', 'error');
    }
  };

  const startEditing = (p: AnalyticsProduct) => {
    setEditingId(p.id);
    setEditPrice(p.price.toString());
    setEditStock(p.stock.toString());
  };

  // Analytics
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalSold = products.reduce((acc, p) => acc + p.sold, 0);
  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Group by category
  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Inventario y Productos</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Gestiona tu stock, precios y visualiza analíticas de ventas.</p>
        </div>
        <button onClick={fetchProducts} className="btn btn-outline" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RefreshCw size={18} /> Actualizar
        </button>
      </div>

      {/* DASHBOARD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8, color: '#4f46e5' }}><Package size={24} /></div>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Total en Stock</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{totalStock}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: '#fdf2f8', borderRadius: 8, color: '#db2777' }}><ShoppingCart size={24} /></div>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Total Vendidos</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{totalSold}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, color: '#dc2626' }}><AlertTriangle size={24} /></div>
          <div>
            <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Alertas de Stock</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{outOfStockProducts.length} <span style={{fontSize:14, fontWeight:400}}>Agotados</span></div>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      {products.length > 0 && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Top 5 Productos Vendidos vs Stock</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="sold" name="Vendidos" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stock" name="En Stock" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* INVENTORY TABLE */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none' }}
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={18} /> Filtrar
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Cargando inventario...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', color: '#6b7280', fontSize: 13, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Producto</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Categoría</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Precio ($)</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Stock</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Vendidos</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{p.description}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '4px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 12 }}>{p.category}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {editingId === p.id ? (
                        <input type="number" value={editPrice} onChange={e=>setEditPrice(e.target.value)} style={{ width: 80, padding: 4, borderRadius: 4, border: '1px solid #d1d5db' }} />
                      ) : (
                        `$${p.price.toFixed(2)}`
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {editingId === p.id ? (
                        <input type="number" value={editStock} onChange={e=>setEditStock(e.target.value)} style={{ width: 80, padding: 4, borderRadius: 4, border: '1px solid #d1d5db' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: p.stock === 0 ? '#dc2626' : p.stock <= 5 ? '#d97706' : '#10b981' }}>{p.stock}</span>
                          {p.stock === 0 && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: 4 }}>Agotado</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#6b7280' }}>{p.sold}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {editingId === p.id ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleEditSave(p.id)} style={{ padding: 6, background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}><Check size={16}/></button>
                          <button onClick={() => setEditingId(null)} style={{ padding: 6, background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: 4, cursor: 'pointer' }}><X size={16}/></button>
                        </div>
                      ) : (
                        <button onClick={() => startEditing(p)} style={{ padding: 6, background: 'transparent', color: '#4f46e5', border: 'none', cursor: 'pointer' }}><Edit2 size={16}/></button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No se encontraron productos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
