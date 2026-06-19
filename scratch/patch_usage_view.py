import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

usage_view = """export function SuperAdminAIUsageView({ showToast }: { showToast: (m: string, t?: any) => void }) {
  const [usage, setUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(API_BASE_URL + '/api/super/ai-usage')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsage(data);
        else console.error(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching AI usage:", err);
        setLoading(false);
      });
  }, []);

  const totalCost = usage.reduce((acc, curr) => acc + curr.total_cost, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h2>Uso de IA y Facturación</h2>
          <p><MI name="monitoring"/>Monitoreo de consumo de tokens y costos por Tenant</p>
        </div>
      </div>

      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'var(--color-primary-light)', color: 'var(--color-primary)'}}>
            <MI name="payments"/>
          </div>
          <div className="stat-content">
            <div className="stat-value">${totalCost.toFixed(4)}</div>
            <div className="stat-label">Costo Total IA</div>
          </div>
        </div>
      </div>

      <div className="data-table-wrapper">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>Cargando consumo...</div>
        ) : usage.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-outline)' }}>No hay datos de consumo registrados.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Tenant</th>
                <th>Nombre Tenant</th>
                <th style={{ textAlign: 'right' }}>Tokens Input</th>
                <th style={{ textAlign: 'right' }}>Tokens Output</th>
                <th style={{ textAlign: 'right' }}>Costo Total Estimado ($)</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u, i) => (
                <tr key={i}>
                  <td className="font-mono" style={{ fontSize: 12 }}>{u.tenant_id}</td>
                  <td style={{ fontWeight: 600 }}>{u.tenant_name}</td>
                  <td style={{ textAlign: 'right' }}>{u.input_tokens.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{u.output_tokens.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                    ${u.total_cost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
"""

# Insert right before // ROOT APP
root_app_marker = "// ROOT APP"
content = content.replace(root_app_marker, usage_view + "\n// ═══════════════════════════════════════════════════════════════════════════════\n" + root_app_marker)

# Add sidebar button
sidebar_old = """          <button className={`nav-item ${activeTab==='super-ai-keys'?'active':''}`} onClick={()=>setActiveTab('super-ai-keys')}>
            <MI name="smart_toy"/> Balanceador de IA
          </button>"""
sidebar_new = """          <button className={`nav-item ${activeTab==='super-ai-keys'?'active':''}`} onClick={()=>setActiveTab('super-ai-keys')}>
            <MI name="smart_toy"/> Balanceador de IA
          </button>
          <button className={`nav-item ${activeTab==='super-ai-usage'?'active':''}`} onClick={()=>setActiveTab('super-ai-usage')}>
            <MI name="monitoring"/> Uso de IA (Facturación)
          </button>"""
content = content.replace(sidebar_old, sidebar_new)

# Add route view
view_old = """              {activeTab==='super-ai-keys' &&<SuperAdminAIKeysView showToast={showToast} searchQuery={searchQuery}/>}"""
view_new = """              {activeTab==='super-ai-keys' &&<SuperAdminAIKeysView showToast={showToast} searchQuery={searchQuery}/>}
              {activeTab==='super-ai-usage' &&<SuperAdminAIUsageView showToast={showToast}/>}"""
content = content.replace(view_old, view_new)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Added SuperAdminAIUsageView")
