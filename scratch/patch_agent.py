import re

with open("backend/agent.py", "r", encoding="utf-8") as f:
    content = f.read()

wrapper_def = """
async def _tracked_completion(db, tenant_id, key_id, provider, model_name, client_func, *args, **kwargs):
    from fastapi.concurrency import run_in_threadpool
    from backend.ai_balancer import record_ai_usage
    response = await run_in_threadpool(client_func, *args, **kwargs)
    try:
        if hasattr(response, "usage") and response.usage:
            record_ai_usage(db, tenant_id, key_id, provider, model_name, 
                            getattr(response.usage, "prompt_tokens", 0), 
                            getattr(response.usage, "completion_tokens", 0))
    except Exception as e:
        print(f"Error recording usage: {e}")
    return response

async def _tracked_gemini(db, tenant_id, key_id, provider, model_name, model, contents):
    from backend.ai_balancer import record_ai_usage
    response = model.generate_content(contents)
    try:
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            record_ai_usage(db, tenant_id, key_id, provider, model_name, 
                            getattr(response.usage_metadata, "prompt_token_count", 0), 
                            getattr(response.usage_metadata, "candidates_token_count", 0))
    except Exception as e:
        print(f"Error recording usage: {e}")
    return response
"""

# Insert wrapper def at the top after imports
import_end = content.find("def clean_ai_response")
content = content[:import_end] + wrapper_def + "\n" + content[import_end:]

# Replace OpenAI / DeepSeek / Groq / OpenRouter calls
content = content.replace(
    "await run_in_threadpool(client.chat.completions.create,",
    "await _tracked_completion(db, tenant.id, key_id, provider, model_name, client.chat.completions.create,"
)

# Replace Gemini calls
content = content.replace(
    "response = model.generate_content(contents)",
    "response = await _tracked_gemini(db, tenant.id, key_id, provider, gemini_model_name, model, contents)"
)

# Replace Gemini final calls (if any)
# Wait, gemini uses model.generate_content multiple times?
content = content.replace(
    "final_response = model.generate_content(contents)",
    "final_response = await _tracked_gemini(db, tenant.id, key_id, provider, gemini_model_name, model, contents)"
)

with open("backend/agent.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated agent.py with usage tracking")
