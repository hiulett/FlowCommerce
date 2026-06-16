-- Inicialización de Base de Datos y Activación de pgvector
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Las tablas serán creadas por SQLAlchemy. Una vez creadas, este script
-- configura las políticas de Row-Level Security (RLS) para el aislamiento de datos.

-- 1. Habilitar RLS en las tablas críticas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Crear Políticas de Aislamiento de Tenants basadas en la variable de sesión 'app.current_tenant_id'
-- NOTA: Las políticas usan la variable SET LOCAL app.current_tenant_id dentro de cada transacción.

-- Política para la tabla tenants (el tenant puede ver su propia configuración)
CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL
    USING (id::text = current_setting('app.current_tenant_id', true));

-- Políticas de aislamiento general
CREATE POLICY tenant_isolation_users ON users
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_customers ON customers
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_categories ON categories
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_products ON products
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_orders ON orders
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_order_items ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.tenant_id::text = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY tenant_isolation_payments ON payments
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_conversations ON conversations
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_messages ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND conversations.tenant_id::text = current_setting('app.current_tenant_id', true)
        )
    );

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true));
