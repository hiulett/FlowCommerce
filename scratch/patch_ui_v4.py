import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update SuperAdminAIKeysView State
state_old = """  const [supportsTools, setSupportsTools] = useState(true);
  const [tasks, setTasks] = useState('');
  const [spendingLimit, setSpendingLimit] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);"""
state_new = """  const [supportsTools, setSupportsTools] = useState(true);
  const [tasks, setTasks] = useState<string[]>([]);
  const [spendingLimit, setSpendingLimit] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePeriod, setUsagePeriod] = useState<string>('monthly');

  // Transfer List Data
  const availableTasksList = ["CONVERSATION", "TOOL_CALLING", "RAG", "SUPPORT_AGENT", "IMAGE_GENERATION"];"""
content = content.replace(state_old, state_new)

# 2. Update fetchUsage with period
fetch_usage_old = """  const fetchUsage = useCallback(() => {
    setUsageLoading(true);
    fetch(API_BASE_URL + '/api/super/ai-usage')"""
fetch_usage_new = """  const fetchUsage = useCallback(() => {
    setUsageLoading(true);
    fetch(API_BASE_URL + '/api/super/ai-usage?period=' + usagePeriod)"""
content = content.replace(fetch_usage_old, fetch_usage_new)

# Add usagePeriod to the dependency array
content = content.replace("  }, [fetchUsage]);", "  }, [fetchUsage, usagePeriod]);")

# 3. Update tasks in handleSubmit (tasks is now string[])
handle_submit_old = """        tasks: tasks || null,"""
handle_submit_new = """        tasks: tasks.length > 0 ? JSON.stringify(tasks) : null,"""
content = content.replace(handle_submit_old, handle_submit_new)

# 4. Update openEditModal for tasks
open_edit_old = """    setTasks(k.tasks || '');"""
open_edit_new = """    try {
      if (k.tasks) {
        setTasks(typeof k.tasks === 'string' ? JSON.parse(k.tasks) : k.tasks);
      } else {
        setTasks([]);
      }
    } catch(e) { setTasks([]); }"""
content = content.replace(open_edit_old, open_edit_new)

# Update reset form
content = content.replace("setTasks('');", "setTasks([]);")

# 5. Move the Usage Table to the TOP of the Keys List, and add Charts
# We will locate the header of the page, insert the Usage Dashboard, then the keys table.
# First, remove the old usage_table string at the end of the file.
# The old usage table starts with: <div className="page-header" style={{ marginTop: 40 }}>

usage_table_regex = re.compile(r'<div className="page-header" style=\{\{ marginTop: 40 \}\}>.*?(?=    </div>\n  \);\n})', re.DOTALL)
content = usage_table_regex.sub('', content)

# Now, insert the new Dashboard at the top, right after the main page header
new_dashboard = """
      {/* ─── DASHBOARD DE USO Y FACTURACIÓN (TOP) ─── */}
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
      </div>
"""
# Insert after "Agregar Conexión de IA\n        </button>\n      </div>"
content = content.replace("Agregar Conexión de IA\n        </button>\n      </div>", "Agregar Conexión de IA\n        </button>\n      </div>\n" + new_dashboard)


# 6. Replace tasks input with Dual Listbox (Transfer List)
tasks_input_old = """              <div className="form-group">
                <label className="form-label">Tareas (Opcional, separadas por coma)</label>
                <input className="form-input" placeholder="Ej: conver, tools" value={tasks} onChange={e => setTasks(e.target.value)}/>
                <span className="form-hint">Si se deja en blanco, la llave servirá para todas las tareas.</span>
              </div>"""

tasks_input_new = """              <div className="form-group">
                <label className="form-label">Asignación de Tareas (Transfer List)</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 8, height: 150, overflowY: 'auto', background: 'var(--color-bg-alt)', padding: 5 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-outline)', padding: 5, borderBottom: '1px solid var(--color-border)', marginBottom: 5 }}>Disponibles</div>
                    {availableTasksList.filter(t => !tasks.includes(t)).map(t => (
                      <div key={t} onClick={() => setTasks([...tasks, t])} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 4, background: 'var(--color-bg-primary)', marginBottom: 2 }}>
                        {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <MI name="arrow_forward_ios" style={{ fontSize: 16, color: 'var(--color-outline)' }}/>
                    <MI name="arrow_back_ios" style={{ fontSize: 16, color: 'var(--color-outline)' }}/>
                  </div>
                  <div style={{ flex: 1, border: '1px solid var(--color-primary)', borderRadius: 8, height: 150, overflowY: 'auto', background: 'var(--color-bg-primary)', padding: 5 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', padding: 5, borderBottom: '1px solid var(--color-border)', marginBottom: 5 }}>Asignadas</div>
                    {tasks.map(t => (
                      <div key={t} onClick={() => setTasks(tasks.filter(x => x !== t))} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 4, background: 'var(--color-primary-light)', color: 'var(--color-primary)', marginBottom: 2 }}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <span className="form-hint">Haz clic en una tarea para moverla de lista. Si la lista de asignadas está vacía, servirá para todas las tareas.</span>
              </div>"""
content = content.replace(tasks_input_old, tasks_input_new)

# 7. Update tasks rendering in table
# from: {k.tasks || 'Todas'}
content = content.replace("{k.tasks || 'Todas'}", "{Array.isArray(k.tasks) ? k.tasks.join(', ') : (typeof k.tasks === 'string' ? k.tasks : 'Todas')}")

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("UI Patched successfully")
