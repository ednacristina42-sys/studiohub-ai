"""
Camada de compatibilidade de IA — usa a OpenAI oficial com a TUA chave.

- Lê OPENAI_API_KEY do backend/.env (a tua própria chave OpenAI).
- Chama a API pública da OpenAI (https://api.openai.com) — sem chaves nem base URLs de terceiros.
- Modelo configurável via OPENAI_MODEL (default: "gpt-4o").
"""
import os
from openai import AsyncOpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
# base_url só é passado se explicitamente definido; caso contrário usa o default oficial da OpenAI.
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "") or None

_client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)


async def chat_complete(system: str, message: str, model: str | None = None, image_b64: str | None = None) -> str:
    """Uma volta simples de chat (system + user) -> texto de resposta.

    Se image_b64 for fornecido, envia conteúdo multimodal (texto + imagem) — requer modelo com visão (ex: gpt-4o).
    """
    if image_b64:
        user_content = [
            {"type": "text", "text": message},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
        ]
    else:
        user_content = message
    resp = await _client.chat.completions.create(
        model=model or OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
    )
    return (resp.choices[0].message.content or "").strip()
