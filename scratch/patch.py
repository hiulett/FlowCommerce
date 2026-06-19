import re

with open('backend/agent.py', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer_native(match):
    prefix = match.group(1)
    provider = match.group(2)
    # the matching provider should NOT contain "-Texto"
    if "-Texto" in provider:
        return match.group(0) # don't modify
    
    return f"{prefix}if not final_text or not str(final_text).strip():\n{prefix}    final_text = f'✅ Acción completada: {{tool_result}}'\n{prefix}print(f\"[IA] Respuesta final post-herramienta ({provider}) generada: '{{final_text}}'\")"

# Native tool calls
content = re.sub(
    r'(\s+)print\(f"\[IA\] Respuesta final post-herramienta \((.*?)\) generada: \'{final_text}\'"\)',
    replacer_native,
    content
)

def replacer_text(match):
    prefix = match.group(1)
    provider = match.group(2)
    if "-Texto" not in provider:
        return match.group(0)
        
    return f"{prefix}if not final_text or not str(final_text).strip():\n{prefix}    final_text = f'✅ Acción completada: {{text_tool_result}}'\n{prefix}print(f\"[IA] Respuesta final post-herramienta ({provider}) generada: '{{final_text}}'\")"

# Text tool calls
content = re.sub(
    r'(\s+)print\(f"\[IA\] Respuesta final post-herramienta \((.*?)\) generada: \'{final_text}\'"\)',
    replacer_text,
    content
)

with open('backend/agent.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied carefully")
