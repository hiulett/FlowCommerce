import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update SuperAdminAIKeysView state to support editing
state_old = """  const [tasks, setTasks] = useState('');
  const [spendingLimit, setSpendingLimit] = useState('');"""
state_new = """  const [tasks, setTasks] = useState('');
  const [spendingLimit, setSpendingLimit] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);"""
content = content.replace(state_old, state_new)

# 2. Add fetchUsage to SuperAdminAIKeysView
fetch_usage = """
  const fetchUsage = useCallback(() => {
    setUsageLoading(true);
    fetch(API_BASE_URL + '/api/super/ai-usage')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsage(data);
        else console.error(data);
        setUsageLoading(false);
      })
      .catch(err => {
        console.error("Error fetching AI usage:", err);
        setUsageLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);
"""
content = content.replace("  useEffect(() => {\n    fetchKeys();\n  }, [fetchKeys]);", "  useEffect(() => {\n    fetchKeys();\n  }, [fetchKeys]);\n" + fetch_usage)

# 3. Update handleSubmit to support Edit
handle_submit_old = """    fetch(API_BASE_URL + '/api/super/ai-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        name,
        api_key: apiKey,
        model_name: modelName,
        supports_tools: supportsTools,
        tasks: tasks || null,
        spending_limit: spendingLimit ? parseFloat(spendingLimit) : null
      })
    })"""
handle_submit_new = """    const url = editingKeyId ? `${API_BASE_URL}/api/super/ai-keys/${editingKeyId}` : `${API_BASE_URL}/api/super/ai-keys`;
    const method = editingKeyId ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        name,
        api_key: apiKey || undefined,
        model_name: modelName,
        supports_tools: supportsTools,
        tasks: tasks || null,
        spending_limit: spendingLimit ? parseFloat(spendingLimit) : null
      })
    })"""
content = content.replace(handle_submit_old, handle_submit_new)

toast_old = "showToast('Conexión de IA agregada correctamente', 'success');"
toast_new = "showToast(editingKeyId ? 'Conexión de IA actualizada correctamente' : 'Conexión de IA agregada correctamente', 'success');"
content = content.replace(toast_old, toast_new)

modal_false_old = "setModal(false);"
modal_false_new = "setModal(false); setEditingKeyId(null);"
content = content.replace(modal_false_old, modal_false_new)

# 4. Add openEditModal
open_edit = """
  const openEditModal = (k: AIKey) => {
    setEditingKeyId(k.id);
    setName(k.name);
    setProvider(k.provider);
    setModelName(k.model_name);
    setApiKey(''); // Do not show existing
    setSupportsTools(k.supports_tools);
    setTasks(k.tasks || '');
    setSpendingLimit(k.spending_limit ? String(k.spending_limit) : '');
    setModal(true);
  };
"""
content = content.replace("  const handleSubmit = (e: React.FormEvent) => {", open_edit + "\n  const handleSubmit = (e: React.FormEvent) => {")

# 5. Add edit button to table actions
edit_btn = """                      <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={() => openEditModal(k)}>
                        <MI name="edit" style={{ fontSize: 16 }}/>
                      </button>"""
content = content.replace('                      <button className="btn btn-ghost" style={{ padding: \'4px 10px\' }} onClick={() => handleToggle(k.id, k.name)}>', edit_btn + '\n                      <button className="btn btn-ghost" style={{ padding: \'4px 10px\' }} onClick={() => handleToggle(k.id, k.name)}>')

# 6. Change modal title if editing
title_old = 'title="Agregar Conexión de IA" subtitle="Registra una nueva API Key en el balanceador"'
title_new = 'title={editingKeyId ? "Editar Conexión de IA" : "Agregar Conexión de IA"} subtitle={editingKeyId ? "Actualiza los datos de la conexión" : "Registra una nueva API Key en el balanceador"}'
content = content.replace(title_old, title_new)

key_req_old = 'required placeholder="Ingresa la clave API"'
key_req_new = 'required={!editingKeyId} placeholder={editingKeyId ? "Déjalo en blanco para mantener la actual" : "Ingresa la clave API"}'
content = content.replace(key_req_old, key_req_new)

# 7. Add Usage Table to the end of SuperAdminAIKeysView
usage_table = """
      <div className="page-header" style={{ marginTop: 40 }}>
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
            <div className="stat-value">${usage.reduce((acc, curr) => acc + curr.total_cost, 0).toFixed(4)}</div>
            <div className="stat-label">Costo Total IA</div>
          </div>
        </div>
      </div>
      <div className="data-table-wrapper">
        {usageLoading ? (
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
                <th style={{ textAlign: 'right' }}>Costo Estimado ($)</th>
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
"""
content = content.replace("    </div>\n  );\n}\n\n// ═══════════════════════════════════════════════════════════════════════════════\n// ROOT APP", usage_table + "\n    </div>\n  );\n}\n\n// ═══════════════════════════════════════════════════════════════════════════════\n// ROOT APP")

# 8. Remove SuperAdminAIUsageView from App.tsx
# Using regex to remove the whole component
content = re.sub(r'export function SuperAdminAIUsageView.*?\(\n    </div>\n  \);\n}\n', '', content, flags=re.DOTALL)

# 9. Remove sidebar button and route view for super-ai-usage
content = re.sub(r'<button className=\{`nav-item \$\{activeTab===\'super-ai-usage\'\?\'active\':\'\'\}`\} onClick=\{\(\)=>setActiveTab\(\'super-ai-usage\'\)\}>\n\s*<MI name="monitoring"/> Uso de IA \(Facturación\)\n\s*</button>', '', content)
content = re.sub(r'\{activeTab===\'super-ai-usage\' &&<SuperAdminAIUsageView showToast=\{showToast\}/>\}', '', content)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched UI")
