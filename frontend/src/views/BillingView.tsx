import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function BillingView({ showToast }: { showToast: (m: string, t?: any) => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tenant/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      } else {
        showToast('Error al cargar facturas', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totalInvoiced = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0), [invoices]);
  const totalPending = useMemo(() => invoices.filter(i => i.status === 'PENDING').reduce((acc, inv) => acc + (inv.total_amount || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter(i => i.status === 'PAID').reduce((acc, inv) => acc + (inv.total_amount || 0), 0), [invoices]);

  const updateInvoiceStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tenant/invoices/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Factura actualizada a ${newStatus}`, 'success');
        fetchInvoices();
      } else {
        const error = await res.json();
        showToast(`Error: ${error.detail || 'No se pudo actualizar'}`, 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    }
  };

  const ActionRenderer = (props: any) => {
    const inv = props.data;
    if (inv.status === 'PAID' || inv.status === 'CANCELLED') {
      return <span style={{ color: '#888' }}>Sin acciones</span>;
    }
    return (
      <div style={{ display: 'flex', gap: '5px', paddingTop: '4px' }}>
        <button className="btn btn-sm btn-primary" onClick={() => updateInvoiceStatus(inv.id, 'PAID')}>Marcar Pagada</button>
        <button className="btn btn-sm btn-outline" style={{ borderColor: 'red', color: 'red' }} onClick={() => updateInvoiceStatus(inv.id, 'CANCELLED')}>Anular</button>
      </div>
    );
  };

  const colDefs = [
    { field: 'invoice_number', headerName: 'N° Factura', filter: true, width: 120 },
    { field: 'customer_name', headerName: 'Cliente', filter: true, width: 200 },
    { 
      field: 'status', 
      headerName: 'Estado', 
      filter: true, 
      width: 120,
      cellRenderer: (params: any) => {
        const color = params.value === 'PAID' ? 'var(--success)' : params.value === 'PENDING' ? 'var(--warning)' : 'var(--danger)';
        return <span style={{ color, fontWeight: 'bold' }}>{params.value}</span>;
      }
    },
    { field: 'subtotal', headerName: 'Subtotal ($)', valueFormatter: (p: any) => `$${p.value?.toFixed(2)}`, filter: 'agNumberColumnFilter', width: 130 },
    { field: 'tax_amount', headerName: 'Impuestos ($)', valueFormatter: (p: any) => `$${p.value?.toFixed(2)}`, width: 130 },
    { field: 'delivery_fee', headerName: 'Delivery ($)', valueFormatter: (p: any) => `$${p.value?.toFixed(2)}`, width: 120 },
    { field: 'total_amount', headerName: 'Total ($)', valueFormatter: (p: any) => `$${p.value?.toFixed(2)}`, filter: 'agNumberColumnFilter', width: 130 },
    { field: 'issued_at', headerName: 'Fecha Emisión', valueFormatter: (p: any) => new Date(p.value).toLocaleString(), width: 180 },
    { headerName: 'Acciones', cellRenderer: ActionRenderer, width: 200, sortable: false, filter: false }
  ];

  const defaultColDef = { sortable: true, resizable: true };

  // Datos para gráfico
  const statusData = [
    { name: 'Pagadas', value: totalPaid, color: '#10b981' },
    { name: 'Pendientes', value: totalPending, color: '#f59e0b' }
  ];

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Módulo de Facturación</h2>
        <button className="btn btn-outline" onClick={fetchInvoices}>Actualizar Datos</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
          <h4 style={{ margin: 0, color: '#166534' }}>Ingresos Totales</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#15803d' }}>${totalInvoiced.toFixed(2)}</h2>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', backgroundColor: '#ecfdf5' }}>
          <h4 style={{ margin: 0, color: '#065f46' }}>Pagado</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#047857' }}>${totalPaid.toFixed(2)}</h2>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', backgroundColor: '#fffbeb' }}>
          <h4 style={{ margin: 0, color: '#92400e' }}>Pendiente por Cobrar</h4>
          <h2 style={{ margin: '10px 0 0 0', color: '#b45309' }}>${totalPending.toFixed(2)}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 400px', padding: '15px' }}>
          <h4>Estado de Cartera</h4>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '15px', flex: '1' }}>
        <h4>Listado de Facturas</h4>
        <div className="ag-theme-alpine" style={{ height: '500px', width: '100%', marginTop: '10px' }}>
          <AgGridReact
            rowData={invoices}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={20}
          />
        </div>
      </div>
    </div>
  );
}
