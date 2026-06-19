import re

with open("frontend/src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Append usage table to the end of SuperAdminAIKeysView
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
    </div>
  );
}
"""

# Replace the closing of SuperAdminAIKeysView
if "      )}\n    </div>\n  );\n}" in content:
    content = content.replace("      )}\n    </div>\n  );\n}", "      )}\n" + usage_table)

# Remove the standalone SuperAdminAIUsageView component
# Let's just find the start and remove everything until the next component or ROOT APP
start_idx = content.find("export function SuperAdminAIUsageView")
if start_idx != -1:
    end_idx = content.find("// ROOT APP", start_idx)
    if end_idx != -1:
        # Keep the ROOT APP comment
        content = content[:start_idx] + content[end_idx:]

with open("frontend/src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied fix")
