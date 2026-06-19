import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update AIKey Interface
interface_replacement = """export interface AIKey {
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
  tasks?: string | null;
  spending_limit?: number | null;
  current_spend?: number;
}"""
content = re.sub(r"export interface AIKey \{[^}]+\}", interface_replacement, content)

# 2. Add state to SuperAdminAIKeysView
state_add = """  const [supportsTools, setSupportsTools] = useState(true);
  const [tasks, setTasks] = useState('');
  const [spendingLimit, setSpendingLimit] = useState('');"""
content = content.replace("  const [supportsTools, setSupportsTools] = useState(true);", state_add)

# 3. Update handleSubmit
submit_old = """      body: JSON.stringify({
        provider,
        name,
        api_key: apiKey,
        model_name: modelName,
        supports_tools: supportsTools
      })"""
submit_new = """      body: JSON.stringify({
        provider,
        name,
        api_key: apiKey,
        model_name: modelName,
        supports_tools: supportsTools,
        tasks: tasks || null,
        spending_limit: spendingLimit ? parseFloat(spendingLimit) : null
      })"""
content = content.replace(submit_old, submit_new)

# 4. Update form reset
reset_old = """        setSupportsTools(true);
        fetchKeys();"""
reset_new = """        setSupportsTools(true);
        setTasks('');
        setSpendingLimit('');
        fetchKeys();"""
content = content.replace(reset_old, reset_new)

# 5. Add to table header
th_old = """                <th style={{ textAlign: 'center' }}>Soporta Tools</th>
                <th>Métricas / Salud</th>"""
th_new = """                <th style={{ textAlign: 'center' }}>Soporta Tools</th>
                <th>Tareas</th>
                <th>Presupuesto</th>
                <th>Métricas / Salud</th>"""
content = content.replace(th_old, th_new)

# 6. Add to table body
td_old = """                  <td style={{ textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: k.supports_tools ? 'var(--color-success-emerald)' : 'var(--color-outline)' }}>
                      {k.supports_tools ? 'check_circle' : 'cancel'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>"""
td_new = """                  <td style={{ textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: k.supports_tools ? 'var(--color-success-emerald)' : 'var(--color-outline)' }}>
                      {k.supports_tools ? 'check_circle' : 'cancel'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {k.tasks || 'Todas'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    ${(k.current_spend || 0).toFixed(4)} {k.spending_limit ? `/ $${k.spending_limit}` : ''}
                  </td>
                  <td style={{ fontSize: 12 }}>"""
content = content.replace(td_old, td_new)

# 7. Add inputs to form
form_old = """              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={supportsTools} onChange={e => setSupportsTools(e.target.checked)}/>
                  <span>Soporta Function Calling (Herramientas del Carrito/RAG)</span>
                </label>
              </div>"""

form_new = """              <div className="form-group">
                <label className="form-label">Tareas (Opcional, separadas por coma)</label>
                <input className="form-input" placeholder="Ej: conver, tools" value={tasks} onChange={e => setTasks(e.target.value)}/>
                <span className="form-hint">Si se deja en blanco, la llave servirá para todas las tareas.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Límite de Gasto $ (Opcional)</label>
                <input type="number" step="0.01" className="form-input" placeholder="Ej: 5.00" value={spendingLimit} onChange={e => setSpendingLimit(e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={supportsTools} onChange={e => setSupportsTools(e.target.checked)}/>
                  <span>Soporta Function Calling (Herramientas del Carrito/RAG)</span>
                </label>
              </div>"""
content = content.replace(form_old, form_new)

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated SuperAdminAIKeysView")
