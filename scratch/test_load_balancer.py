import sys
import os
import uuid
from datetime import datetime, timedelta

# Agregar ruta base al path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import SessionLocal, Base, engine
from backend.models import PlatformAIKey
from backend.ai_balancer import AILoadBalancer, encrypt_key, decrypt_key

def test_load_balancer():
    print("=== INICIANDO PRUEBAS DE BALANCEADOR DE IA ===")
    
    # Crear tablas
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Limpiar todas las llaves previas de prueba
        db.query(PlatformAIKey).delete()
        db.commit()
        
        # 1. Crear claves de prueba encriptadas
        key1 = PlatformAIKey(
            provider="gemini",
            name="Test Key 1",
            api_key=encrypt_key("fake-key-1"),
            model_name="gemini-2.0-flash",
            supports_tools=True,
            is_active=True
        )
        key2 = PlatformAIKey(
            provider="groq",
            name="Test Key 2",
            api_key=encrypt_key("fake-key-2"),
            model_name="llama-3.3-70b-versatile",
            supports_tools=True,
            is_active=True
        )
        
        db.add(key1)
        db.add(key2)
        db.commit()
        
        print("[TEST] Claves de prueba insertadas y encriptadas con éxito.")
        
        # 2. Inicializar balanceador
        balancer = AILoadBalancer()
        
        # 3. Test Round Robin (Deberían alternar ya que se actualiza el last_used)
        print("\n--- Test de Distribución Round-Robin ---")
        selected_first = balancer.get_next_available_key(db)
        print(f"1ra selección: {selected_first.name} (last_used: {selected_first.last_used})")
        balancer.update_last_used(db, selected_first.id)
        
        selected_second = balancer.get_next_available_key(db)
        print(f"2da selección: {selected_second.name} (last_used: {selected_second.last_used})")
        balancer.update_last_used(db, selected_second.id)
        
        selected_third = balancer.get_next_available_key(db)
        print(f"3ra selección: {selected_third.name} (last_used: {selected_third.last_used})")
        
        assert selected_first.id != selected_second.id, "Error: Se seleccionó la misma clave consecutivamente."
        assert selected_third.id == selected_first.id, "Error: El round-robin no regresó al primer elemento."
        print("[TEST PASS] Distribución round-robin correcta.")
        
        # 4. Test Cool-down / Error 429
        print("\n--- Test de Aislamiento y Enfriamiento (Cool-down) ---")
        balancer.mark_cool_down(db, selected_first.id, minutes=5)
        
        # Intentar obtener llave de nuevo, debería elegir la segunda ya que la primera está en enfriamiento
        next_selected = balancer.get_next_available_key(db)
        print(f"Seleccionada después de enfriar la 1ra: {next_selected.name} (Debería ser Test Key 2)")
        assert next_selected.id == key2.id, "Error: El balanceador seleccionó una llave que está en periodo de enfriamiento."
        print("[TEST PASS] Aislamiento de llaves en enfriamiento correcto.")
        
        # 5. Test Exclude IDs
        print("\n--- Test de Exclusión de Llaves (exclude_ids) ---")
        # Ambos están en enfriamiento o activos, pero excluimos Test Key 2
        exclude_test = balancer.get_next_available_key(db, exclude_ids=[key2.id])
        print(f"Seleccionada excluyendo Test Key 2: {exclude_test.name} (Debería ser Test Key 1)")
        assert exclude_test.id == key1.id, "Error: Se seleccionó una llave excluida."
        
        # Poner ambas en enfriamiento y excluir la menos bloqueada (Key 1)
        balancer.mark_cool_down(db, key1.id, minutes=10)
        balancer.mark_cool_down(db, key2.id, minutes=20)
        
        fallback_exclude = balancer.get_next_available_key(db, exclude_ids=[key1.id])
        print(f"Fallback excluyendo Test Key 1 (menos bloqueada): {fallback_exclude.name} (Debería ser Test Key 2)")
        assert fallback_exclude.id == key2.id, "Error: No se respetó la exclusión en la lógica de fallback."
        print("[TEST PASS] Exclusión de llaves (exclude_ids) respetada correctamente en modo normal y fallback.")
        
        # Limpieza de llaves de prueba
        db.query(PlatformAIKey).filter(PlatformAIKey.name.like("Test Key %")).delete(synchronize_session=False)
        db.commit()
        print("\n=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_load_balancer()
