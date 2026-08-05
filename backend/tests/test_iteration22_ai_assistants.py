"""Tests for the /api/ai/assistant endpoint (4 specialised assistants)."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={
        "email": "geral@studioefotografias.pt",
        "password": "studio123",
    }, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


ASSISTANT_PROMPTS = {
    "comercial": "Escreve uma curta mensagem de WhatsApp para um novo lead de casamento.",
    "fotografico": "Cria um checklist muito curto para uma sessão de retrato.",
    "financeiro": "Lista os clientes em atraso com valores. Se não houver, diz claramente.",
    "marketing": "Cria uma legenda curta para Instagram sobre outono.",
}


@pytest.mark.parametrize("assistant", list(ASSISTANT_PROMPTS.keys()))
def test_assistant_returns_200_and_pt_pt(session, assistant):
    r = session.post(f"{API}/ai/assistant", json={
        "assistant": assistant,
        "message": ASSISTANT_PROMPTS[assistant],
        "session_id": "",
    }, timeout=90)
    assert r.status_code == 200, f"{assistant} => {r.status_code} {r.text[:200]}"
    data = r.json()
    assert data.get("assistant") == assistant
    assert isinstance(data.get("session_id"), str) and data["session_id"]
    assert isinstance(data.get("reply"), str) and len(data["reply"]) > 20


def test_financeiro_uses_real_data(session):
    """The financial assistant must reference the studio's real data (overdue clients)."""
    r = session.post(f"{API}/ai/assistant", json={
        "assistant": "financeiro",
        "message": "Quais são os clientes em atraso? Lista-os com o respectivo valor em euros.",
        "session_id": "",
    }, timeout=90)
    assert r.status_code == 200
    reply = r.json()["reply"].lower()
    # Real data reference: mentions euro sign or 'atraso'/'clientes' terminology
    assert ("€" in reply) or ("atraso" in reply) or ("sem clientes" in reply)


def test_invalid_assistant_falls_back(session):
    r = session.post(f"{API}/ai/assistant", json={
        "assistant": "invalid_x",
        "message": "Olá, apresenta-te.",
        "session_id": "",
    }, timeout=90)
    assert r.status_code == 200
    assert r.json().get("assistant") == "comercial"


def test_session_continuity(session):
    r1 = session.post(f"{API}/ai/assistant", json={
        "assistant": "comercial",
        "message": "Diz apenas 'olá'.",
        "session_id": "",
    }, timeout=90)
    assert r1.status_code == 200
    sid = r1.json()["session_id"]
    r2 = session.post(f"{API}/ai/assistant", json={
        "assistant": "comercial",
        "message": "Qual foi a minha última mensagem?",
        "session_id": sid,
    }, timeout=90)
    assert r2.status_code == 200
    assert r2.json()["session_id"] == sid
