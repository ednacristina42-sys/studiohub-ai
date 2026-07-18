"""StudioHub AI — Backend API tests (pytest) — Iteration 3

Covers current API surface including new iteration 3 features:
 - Templates: GET /api/templates -> {quotes:[3], contracts:[2]}
 - Quotes: CRUD + status + conversions (to invoice / to contract)
 - Contracts: CRUD + status + sign
 - AI Assistant: POST /api/ai/chat + GET /api/ai/history/{session_id}
 - Regression on iteration 2: clients, sessions, galleries, invoices, dashboard
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


# ---------------- Health / Seed / Dashboard ----------------
class TestHealthAndSeed:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert "message" in r.json()

    def test_seed_idempotent(self, api_client):
        r1 = api_client.post(f"{BASE_URL}/api/seed", timeout=30)
        assert r1.status_code == 200
        r2 = api_client.post(f"{BASE_URL}/api/seed", timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("seeded") is False, "seed must be idempotent after first call"

    def test_dashboard_stats_shape(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in [
            "revenue_month", "revenue_year", "active_clients", "new_leads",
            "sessions_week", "galleries_delivered", "galleries_pending",
            "pending_payments", "birthdays", "revenue_chart", "sessions_chart",
            "sales_by_service", "client_origins", "upcoming_sessions",
        ]:
            assert k in data, f"missing key {k}"
        assert data["active_clients"] >= 3
        assert data["pending_payments"] > 0


# ---------------- Clients (regression) ----------------
class TestClients:
    created_id = None

    def test_list_clients(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_create_client(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Cliente", "email": "t@x.pt", "status": "lead", "origin": "google"
        }, timeout=15)
        assert r.status_code == 200
        TestClients.created_id = r.json()["id"]

    def test_toggle_favorite(self, api_client):
        r1 = api_client.patch(f"{BASE_URL}/api/clients/{TestClients.created_id}/favorite", timeout=15)
        assert r1.status_code == 200 and r1.json()["favorite"] is True

    def test_delete_client(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/clients/{TestClients.created_id}", timeout=15)
        assert r.status_code == 200


# ---------------- Sessions (regression) ----------------
class TestSessions:
    sid = None

    def test_list_sessions_seed(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/sessions", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_create_and_delete_session(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/sessions", json={
            "title": "TEST_Sessao", "type": "retrato", "date": "2026-09-10", "value": 300
        }, timeout=15)
        assert r.status_code == 200
        sid = r.json()["id"]
        r2 = api_client.patch(f"{BASE_URL}/api/sessions/{sid}/status", json={"status": "realizada"}, timeout=15)
        assert r2.status_code == 200 and r2.json()["status"] == "realizada"
        r3 = api_client.delete(f"{BASE_URL}/api/sessions/{sid}", timeout=15)
        assert r3.status_code == 200


# ---------------- Invoices (regression totals) ----------------
class TestInvoices:
    def test_create_invoice_totals(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/invoices", json={
            "client_name": "TEST_Inv", "type": "fatura", "status": "pendente", "tax_rate": 23,
            "items": [{"description": "S1", "quantity": 2, "price": 100}]
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["subtotal"] == 200.0 and d["tax"] == 46.0 and d["total"] == 246.0
        api_client.delete(f"{BASE_URL}/api/invoices/{d['id']}", timeout=15)


# ---------------- Templates (NEW) ----------------
class TestTemplates:
    def test_templates_shape(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/templates", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "quotes" in data and "contracts" in data
        assert len(data["quotes"]) == 3
        assert len(data["contracts"]) == 2
        # verify quote template has items with description/price/quantity
        q = data["quotes"][0]
        assert "id" in q and "name" in q and "items" in q and "tax_rate" in q
        assert all("description" in i and "price" in i and "quantity" in i for i in q["items"])
        # contract template has body with placeholders
        c = data["contracts"][0]
        assert "id" in c and "name" in c and "body" in c
        assert "{cliente}" in c["body"] and "{titulo}" in c["body"]


# ---------------- Quotes (NEW) ----------------
class TestQuotes:
    qid = None

    def test_list_quotes_seed(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/quotes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2, "seed must create at least 2 quotes"
        # verify totals computed
        for q in data:
            assert "subtotal" in q and "tax" in q and "total" in q
            assert re.match(r"^ORC-\d{4}-\d{4}$", q["number"]), f"bad quote number: {q['number']}"

    def test_create_quote_auto_number(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/quotes", json={
            "client_name": "TEST_Cliente_Q",
            "title": "TEST Orçamento",
            "tax_rate": 23,
            "template": "retrato",
            "items": [
                {"description": "Sessão", "quantity": 1, "price": 250},
                {"description": "Edições", "quantity": 2, "price": 50},
            ]
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert re.match(r"^ORC-\d{4}-\d{4}$", d["number"])
        assert d["subtotal"] == 350.0 and d["tax"] == 80.5 and d["total"] == 430.5
        assert d["status"] == "rascunho"
        TestQuotes.qid = d["id"]

    def test_get_quote_by_id(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/quotes/{TestQuotes.qid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == TestQuotes.qid

    def test_update_quote(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/quotes/{TestQuotes.qid}", json={
            "client_name": "TEST_Cliente_Q",
            "title": "TEST Orçamento Atualizado",
            "tax_rate": 23,
            "items": [{"description": "Novo item", "quantity": 1, "price": 500}]
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Orçamento Atualizado"
        assert r.json()["total"] == 615.0

    def test_patch_quote_status(self, api_client):
        r = api_client.patch(f"{BASE_URL}/api/quotes/{TestQuotes.qid}/status",
                             json={"status": "enviado"}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "enviado"

    def test_get_quote_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/quotes/nonexistent-xyz", timeout=15)
        assert r.status_code == 404

    def test_delete_quote(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/quotes/{TestQuotes.qid}", timeout=15)
        assert r.status_code == 200
        g = api_client.get(f"{BASE_URL}/api/quotes/{TestQuotes.qid}", timeout=15)
        assert g.status_code == 404


# ---------------- Quote conversions (NEW) ----------------
class TestQuoteConversions:
    def _make_quote(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/quotes", json={
            "client_name": "TEST_ConvCli",
            "title": "TEST Conversão",
            "tax_rate": 23,
            "items": [{"description": "Serviço", "quantity": 1, "price": 400}]
        }, timeout=15)
        assert r.status_code == 200
        return r.json()

    def test_convert_to_invoice(self, api_client):
        q = self._make_quote(api_client)
        r = api_client.post(f"{BASE_URL}/api/quotes/{q['id']}/convert-to-invoice", timeout=15)
        assert r.status_code == 200
        inv = r.json()
        assert inv["client_name"] == "TEST_ConvCli"
        assert inv["total"] == 492.0
        assert re.match(r"^\d{4}-\d{4}$", inv["number"])
        # Quote status must become convertido and have invoice_id
        r2 = api_client.get(f"{BASE_URL}/api/quotes/{q['id']}", timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        assert d["status"] == "convertido"
        assert d["invoice_id"] == inv["id"]
        # cleanup
        api_client.delete(f"{BASE_URL}/api/invoices/{inv['id']}", timeout=15)
        api_client.delete(f"{BASE_URL}/api/quotes/{q['id']}", timeout=15)

    def test_convert_to_contract(self, api_client):
        q = self._make_quote(api_client)
        r = api_client.post(f"{BASE_URL}/api/quotes/{q['id']}/convert-to-contract", timeout=15)
        assert r.status_code == 200
        ctr = r.json()
        assert ctr["client_name"] == "TEST_ConvCli"
        assert re.match(r"^CTR-\d{4}-\d{4}$", ctr["number"])
        assert ctr["quote_id"] == q["id"]
        assert "TEST_ConvCli" in ctr["body"]
        assert "TEST Conversão" in ctr["body"]
        # quote must have contract_id set
        r2 = api_client.get(f"{BASE_URL}/api/quotes/{q['id']}", timeout=15)
        assert r2.json()["contract_id"] == ctr["id"]
        # cleanup
        api_client.delete(f"{BASE_URL}/api/contracts/{ctr['id']}", timeout=15)
        api_client.delete(f"{BASE_URL}/api/quotes/{q['id']}", timeout=15)

    def test_convert_404_when_quote_missing(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/quotes/nonexistent-abc/convert-to-invoice", timeout=15)
        assert r.status_code == 404
        r2 = api_client.post(f"{BASE_URL}/api/quotes/nonexistent-abc/convert-to-contract", timeout=15)
        assert r2.status_code == 404


# ---------------- Contracts (NEW) ----------------
class TestContracts:
    cid = None
    cid_body = None

    def test_list_contracts_seed(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/contracts", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 2, "seed must create at least 2 contracts"
        for c in data:
            assert re.match(r"^CTR-\d{4}-\d{4}$", c["number"])

    def test_create_contract_from_template_body_auto(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/contracts", json={
            "client_name": "TEST_Ctr_Cliente",
            "title": "TEST Contrato",
            "template": "servicos",
            "body": ""
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert re.match(r"^CTR-\d{4}-\d{4}$", d["number"])
        assert d["status"] == "rascunho"
        # body should be filled from template
        assert d["body"], "body should be auto-filled when template provided and body empty"
        assert "TEST_Ctr_Cliente" in d["body"]
        assert "TEST Contrato" in d["body"]
        TestContracts.cid = d["id"]

    def test_create_contract_with_custom_body(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/contracts", json={
            "client_name": "TEST_Ctr2",
            "title": "TEST 2",
            "template": "servicos",
            "body": "Corpo personalizado do contrato."
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["body"] == "Corpo personalizado do contrato."
        TestContracts.cid_body = d["id"]

    def test_get_contract_by_id(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/contracts/{TestContracts.cid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == TestContracts.cid

    def test_get_contract_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/contracts/nonexistent-xyz", timeout=15)
        assert r.status_code == 404

    def test_patch_contract_status(self, api_client):
        r = api_client.patch(f"{BASE_URL}/api/contracts/{TestContracts.cid}/status",
                             json={"status": "enviado"}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "enviado"

    def test_sign_contract_requires_signer_name(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/contracts/{TestContracts.cid}/sign",
                            json={"signer_name": ""}, timeout=15)
        assert r.status_code == 400

    def test_sign_contract_success(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/contracts/{TestContracts.cid}/sign",
                            json={"signer_name": "Ana Teste"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "assinado"
        assert d["signer_name"] == "Ana Teste"
        assert d["signed_at"]
        # verify persistence
        g = api_client.get(f"{BASE_URL}/api/contracts/{TestContracts.cid}", timeout=15)
        assert g.json()["status"] == "assinado"

    def test_delete_contracts(self, api_client):
        for cid in [TestContracts.cid, TestContracts.cid_body]:
            if cid:
                r = api_client.delete(f"{BASE_URL}/api/contracts/{cid}", timeout=15)
                assert r.status_code == 200


# ---------------- AI Assistant (NEW) ----------------
class TestAIAssistant:
    session_id = None

    def test_ai_chat_basic_portuguese(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Olá, diz apenas 'Olá, como posso ajudar?'"
        }, timeout=90)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert "session_id" in d and d["session_id"]
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0
        TestAIAssistant.session_id = d["session_id"]

    def test_ai_chat_unpaid_context(self, api_client):
        """Assistant should mention an unpaid client from context."""
        r = api_client.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Mostra clientes que ainda nao pagaram"
        }, timeout=90)
        assert r.status_code == 200, r.text[:400]
        reply = r.json()["reply"].lower()
        # Seeded unpaid invoice belongs to "Ana & Rui Ferreira"
        assert ("ana" in reply) or ("ferreira" in reply) or ("por pagar" in reply) or ("pendente" in reply), \
            f"Reply should reference the unpaid client or pending status: {reply[:300]}"

    def test_ai_history_persists(self, api_client):
        assert TestAIAssistant.session_id
        r = api_client.get(f"{BASE_URL}/api/ai/history/{TestAIAssistant.session_id}", timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list)
        # user + assistant pair (at minimum)
        assert len(msgs) >= 2
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
