from sqlalchemy import text
from backend.database import engine
from backend.models import Base

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE platform_ai_keys ADD COLUMN tasks JSON DEFAULT '[\"CONVERSATION\", \"TOOL_CALLING\"]';"))
        print("Column 'tasks' added.")
    except Exception as e:
        print(f"tasks column error: {e}")

    try:
        conn.execute(text("ALTER TABLE platform_ai_keys ADD COLUMN spending_limit NUMERIC(10, 2) DEFAULT NULL;"))
        print("Column 'spending_limit' added.")
    except Exception as e:
        print(f"spending_limit column error: {e}")

    try:
        conn.execute(text("ALTER TABLE platform_ai_keys ADD COLUMN current_spend NUMERIC(10, 6) DEFAULT 0.0;"))
        print("Column 'current_spend' added.")
    except Exception as e:
        print(f"current_spend column error: {e}")
    conn.commit()

Base.metadata.create_all(bind=engine)
print("Migration completed successfully.")
