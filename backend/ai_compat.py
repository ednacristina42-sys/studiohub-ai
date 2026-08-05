"""
ai_compat.py — Substituto independente para `emergentintegrations.llm.chat`.

Motivo: o pacote `emergentintegrations` só existe dentro da infraestrutura da
Emergent e não instala em nenhum outro servidor. Este módulo reimplementa a
mesma interface (LlmChat / UserMessage / ImageContent) usando o SDK oficial da
OpenAI, para que a aplicação deixe de depender da Emergent e possa correr em
qualquer sítio (VPS Hostinger, etc.).

Configuração (variáveis de ambiente):
  OPENAI_API_KEY   -> chave da OpenAI (recomendado). Se vazia, usa a chave
                      passada em LlmChat(api_key=...) como fallback.
  OPENAI_MODEL     -> modelo a usar (opcional). Por omissão: gpt-4o-mini
                      (suporta texto e imagens, económico).

Se não houver nenhuma chave configurada, send_message() levanta uma exceção
clara. Os pontos de chamada já tratam isso com try/except e degradam de forma
suave (a app continua a arrancar e todo o resto funciona normalmente).
"""

import os
import logging

logger = logging.getLogger(__name__)

# Modelo real por omissão. "gpt-5.4" (usado no código antigo) era um alias
# interno da Emergent; aqui mapeamos para um modelo público real.
_DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


class ImageContent:
    """Uma imagem para enviar ao modelo (base64, sem o prefixo data:)."""
    def __init__(self, image_base64=None, **kwargs):
        self.image_base64 = image_base64


class UserMessage:
    """Uma mensagem do utilizador: texto + (opcional) imagens."""
    def __init__(self, text=None, file_contents=None, **kwargs):
        self.text = text or ""
        self.file_contents = file_contents or []


class LlmChat:
    """
    Reimplementação mínima e compatível de emergentintegrations.llm.chat.LlmChat.

    Uso (igual ao código original):
        chat = LlmChat(api_key=..., session_id=..., system_message=...).with_model("openai", "gpt-5.4")
        resposta = await chat.send_message(UserMessage(text="...", file_contents=[ImageContent(...)]))
    """
    def __init__(self, api_key=None, session_id=None, system_message=None, **kwargs):
        # Preferir sempre a OPENAI_API_KEY do ambiente; usar a passada como fallback.
        self.api_key = os.environ.get("OPENAI_API_KEY") or api_key or ""
        self.session_id = session_id
        self.system_message = system_message or ""
        self.model = _DEFAULT_MODEL

    def with_model(self, provider, model=None):
        # Mantém a assinatura antiga (provider, model). O "provider" é ignorado
        # porque usamos sempre a OpenAI; o modelo real vem do ambiente/omissão.
        # Se quiseres forçar um modelo específico, define OPENAI_MODEL no .env.
        if os.environ.get("OPENAI_MODEL"):
            self.model = os.environ["OPENAI_MODEL"]
        return self

    def _build_messages(self, message):
        content = []
        text = getattr(message, "text", "") or ""
        if text:
            content.append({"type": "text", "text": text})
        for img in getattr(message, "file_contents", []) or []:
            b64 = getattr(img, "image_base64", None)
            if b64:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                })
        # Se só há texto, enviar como string simples (mais compatível).
        user_content = text if len(content) <= 1 and not any(
            c["type"] == "image_url" for c in content) else content

        messages = []
        if self.system_message:
            messages.append({"role": "system", "content": self.system_message})
        messages.append({"role": "user", "content": user_content})
        return messages

    async def send_message(self, message) -> str:
        if not self.api_key:
            raise RuntimeError(
                "Nenhuma chave de IA configurada. Define OPENAI_API_KEY no backend/.env "
                "para ativar as funcionalidades de IA."
            )
        # Import tardio para não obrigar a ter o SDK se a IA nunca for usada.
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)
        messages = self._build_messages(message)
        resp = await client.chat.completions.create(
            model=self.model,
            messages=messages,
        )
        return (resp.choices[0].message.content or "").strip()


async def chat_complete(system, message, model=None, image_b64=None):
    api_key = os.environ.get("OPENAI_API_KEY") or ""
    if not api_key:
        raise RuntimeError("Nenhuma chave de IA configurada. Define OPENAI_API_KEY no backend/.env.")
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)
    if image_b64:
        user_content = [
            {"type": "text", "text": message or ""},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
        ]
    else:
        user_content = message or ""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": user_content})
    resp = await client.chat.completions.create(model=model or _DEFAULT_MODEL, messages=messages)
    return (resp.choices[0].message.content or "").strip()
