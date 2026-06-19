import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add recharts imports
if "from 'recharts'" not in content:
    content = content.replace("import { useState, useEffect, useCallback } from 'react';", "import { useState, useEffect, useCallback } from 'react';\nimport { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';")

old_dashboard = """      {/* ─── DASHBOARD DE USO Y FACTURACIÓN (TOP) ─── */}
      <div className="stats-grid mb-6" style={{ marginTop: 20 }}>
        <div className="stat-card" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Consumo por Tenant vs Límite</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className={`btn ${usagePeriod === 'weekly' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setUsagePeriod('weekly')}>Semanal</button>
              <button className={`btn ${usagePeriod === 'biweekly' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setUsagePeriod('biweekly')}>Quincenal</button>
              <button className={`btn ${usagePeriod === 'monthly' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setUsagePeriod('monthly')}>Mensual</button>
            </div>
          </div>
          
          {usageLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-outline)' }}>Cargando gráficas...</div>
          ) : usage.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-outline)' }}>No hay datos de consumo registrados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {usage.sort((a,b) => b.total_cost - a.total_cost).map((u, i) => {
                const limit = u.ai_spending_limit || 0;
                const cost = u.total_cost || 0;
                const percentage = limit > 0 ? Math.min((cost / limit) * 100, 100) : 0;
                const isAlert = u.is_near_limit || percentage >= 90;
                
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                      <span>{u.tenant_name} <span className="font-mono" style={{color:'var(--color-outline)'}}>({u.tenant_id.substring(0,8)})</span></span>
                      <span style={{ color: isAlert ? 'var(--color-error)' : 'inherit' }}>
                        ${cost.toFixed(2)} {limit > 0 ? `/ $${limit.toFixed(2)}` : '(Sin límite)'}
                      </span>
                    </div>
                    {limit > 0 && (
                      <div style={{ width: '100%', height: 8, background: 'var(--color-bg-alt)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          background: isAlert ? 'var(--color-error)' : 'var(--color-primary)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'var(--color-primary-light)', color: 'var(--color-primary)'}}>
            <MI name="payments"/>
          </div>
          <div className="stat-content">
            <div className="stat-value">${usage.reduce((acc, curr) => acc + curr.total_cost, 0).toFixed(4)}</div>
            <div className="stat-label">Costo Total ({usagePeriod})</div>
          </div>
        </div>
      </div>"""

new_dashboard = """      {/* ─── DASHBOARD DE USO Y FACTURACIÓN (TOP) ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Dashboard de Consumo IA</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${usagePeriod === 'weekly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setUsagePeriod('weekly')}>Semanal</button>
          <button className={`btn ${usagePeriod === 'biweekly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setUsagePeriod('biweekly')}>Quincenal</button>
          <button className={`btn ${usagePeriod === 'monthly' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setUsagePeriod('monthly')}>Mensual</button>
        </div>
      </div>

      {usageLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>Cargando gráficas de consumo...</div>
      ) : usage.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>No hay datos de consumo registrados.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 30 }}>
          {/* Gráfica 1: Barras Comparativas de Gasto vs Límite */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 20px 0' }}>Consumo vs Límite por Tenant ($)</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tenant_name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="total_cost" name="Costo Actual" fill="#3b82f6" />
                  <Bar dataKey="ai_spending_limit" name="Límite Presupuestado" fill="#9ca3af" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfica 2: Pie Chart Distribución de Tokens */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 20px 0' }}>Distribución de Tokens Usados</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usage.map(u => ({ name: u.tenant_name, value: u.input_tokens + u.output_tokens }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {usage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 18, fontWeight: 'bold' }}>
              Costo Total ({usagePeriod}): ${usage.reduce((acc, curr) => acc + curr.total_cost, 0).toFixed(4)}
            </div>
          </div>
        </div>
      )}"""

content = content.replace(old_dashboard, new_dashboard)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated App.tsx with Recharts")
