import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShoppingCart, Package, AlertTriangle, RefreshCw, DollarSign, Layers } from 'lucide-react';

import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ClientSideRowModelModule, TextFilterModule, NumberFilterModule, PaginationModule, ValidationModule } from 'ag-grid-community';

// CSS imports for AG Grid
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Register modules
ModuleRegistry.registerModules([ClientSideRowModelModule, TextFilterModule, NumberFilterModule, PaginationModule, ValidationModule]);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const COLORS = ['#4f46e5', '#db2777', '#059669', '#ea580c', '#8b5cf6', '#0ea5e9'];

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
  const [groupByCategory, setGroupByCategory] = useState(false);

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

  const handleCellValueChanged = async (event: any) => {
    const { data, colDef, oldValue, newValue } = event;
    if (oldValue === newValue) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/tenant/products/${data.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(data.price), stock: parseInt(data.stock, 10) })
      });
      if (res.ok) {
        showToast('Producto actualizado correctamente', 'success');
      } else {
        showToast('Error al actualizar', 'error');
        fetchProducts(); // rollback
      }
    } catch (e) {
      showToast('Error de red', 'error');
      fetchProducts(); // rollback
    }
  };

  // Analytics
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalSold = products.reduce((acc, p) => acc + (p.sold || 0), 0);
  const topProducts = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5);

  const outOfStockProducts = products.filter(p => p.stock === 0);

  // Income by Category
  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const income = (p.sold || 0) * (p.price || 0);
      const cat = p.category || 'General';
      if (!map[cat]) map[cat] = 0;
      map[cat] += income;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [products]);

  const totalIncome = incomeByCategory.reduce((acc, item) => acc + item.value, 0);

  // AG Grid config
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
  }), []);

  const columnDefs = useMemo(() => [
    { field: 'name', headerName: 'Producto', filter: 'agTextColumnFilter', minWidth: 200 },
    { field: 'category', headerName: 'Categoría', filter: 'agTextColumnFilter', width: 130 },
    { 
      field: 'price', 
      headerName: 'Precio ($)', 
      filter: 'agNumberColumnFilter',
      editable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toFixed(2)}`,
      cellStyle: { fontWeight: '600' }
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      filter: 'agNumberColumnFilter',
      editable: true,
      cellRenderer: (p: any) => {
        const val = p.value;
        if (val === 0) return <span style={{color: '#dc2626', fontWeight: 600}}>{val} (Agotado)</span>;
        if (val <= 5) return <span style={{color: '#d97706', fontWeight: 600}}>{val}</span>;
        return <span style={{color: '#10b981', fontWeight: 600}}>{val}</span>;
      }
    },
    { field: 'sold', headerName: 'Vendidos', filter: 'agNumberColumnFilter' }
  ], []);

  // Custom grouping renderer
  const categories = Array.from(new Set(products.map(p => p.category || 'General')));

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Inventario y Productos</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Analíticas de ventas, gestión de stock y tabla avanzada.</p>
        </div>
        <button onClick={fetchProducts} className="btn btn-outline" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RefreshCw size={18} /> Actualizar Datos
        </button>
      </div>

      {/* DASHBOARD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
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
          <div style={{ padding: 12, background: '#ecfdf5', borderRadius: 8, color: '#059669' }}><DollarSign size={24} /></div>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Ingresos Totales</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>${totalIncome.toFixed(2)}</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* Gráfico 1: Top 5 Productos */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Top 5 Productos: Stock vs Vendidos</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="sold" name="Vendidos" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stock" name="En Stock" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Ingresos por Categoría (Nuevo) */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Distribución de Ingresos por Categoría</h3>
            <div style={{ height: 260, display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* DATA GRID */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 400 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#4f46e5"/> Base de Datos de Productos
          </h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4b5563', cursor: 'pointer' }}>
              <input type="checkbox" checked={groupByCategory} onChange={e => setGroupByCategory(e.target.checked)} />
              Agrupar por Categorías
            </label>
            <div style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 12 }}>
              Doble clic en Precio o Stock para editar
            </div>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Cargando datos...</div>
        ) : groupByCategory ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {categories.map(cat => {
              const catProducts = products.filter(p => (p.category || 'General') === cat);
              return (
                <div key={cat} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#f9fafb', padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid #e5e7eb', color: '#111827' }}>
                    Categoría: {cat} <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 13, marginLeft: 8 }}>({catProducts.length} productos)</span>
                  </div>
                  <div className="ag-theme-quartz" style={{ height: Math.min(catProducts.length * 42 + 100, 300) }}>
                    <AgGridReact
                      rowData={catProducts}
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
                      onCellValueChanged={handleCellValueChanged}
                      domLayout="autoHeight"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ag-theme-quartz" style={{ flex: 1, width: '100%', height: '100%' }}>
            <AgGridReact
              rowData={products}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              paginationPageSize={10}
              onCellValueChanged={handleCellValueChanged}
            />
          </div>
        )}
      </div>
    </div>
  );
}
