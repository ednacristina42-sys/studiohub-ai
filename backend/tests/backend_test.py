"""StudioHub AI — Backend API tests (pytest) — Iteration 2

Covers the current API surface:
 - GET /api/            -> root
 - POST /api/seed       -> idempotent
 - GET /api/dashboard/stats  -> new advanced shape
 - Clients: GET/POST/PUT/DELETE + PATCH /api/clients/{id}/favorite
 - Sessions: GET/POST/PUT/DELETE + PATCH /api/sessions/{id}/status
 - Galleries: GET/POST/DELETE + PATCH /api/galleries/{id}/status
             + photos add/delete + AI select (real LLM)
 - Invoices: create + list computes totals; status update
"""
import os
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
        assert isinstance(data["birthdays"], list)
        assert isinstance(data["revenue_chart"], list)
        assert isinstance(data["sessions_chart"], list)
        assert isinstance(data["sales_by_service"], list)
        assert isinstance(data["client_origins"], list)
        assert isinstance(data["upcoming_sessions"], list)
        # Seed baseline expectations
        assert data["active_clients"] >= 3
        assert data["new_leads"] >= 2
        assert data["revenue_year"] > 0
        assert data["pending_payments"] > 0
        # revenue chart items shape
        if data["revenue_chart"]:
            item = data["revenue_chart"][0]
            assert "month" in item and "value" in item
        # birthdays shape (may be empty depending on seed date)
        if data["birthdays"]:
            b = data["birthdays"][0]
            assert "name" in b and "days" in b and "date" in b


# ---------------- Clients ----------------
class TestClients:
    created_id = None

    def test_list_clients(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5, "seed must create 5 clients"

    def test_create_client_full_fields(self, api_client):
        payload = {
            "name": "TEST_Cliente",
            "email": "test@example.com",
            "phone": "+351 900 000 000",
            "whatsapp": "+351 900 000 000",
            "address": "Rua TEST 1",
            "nif": "999999999",
            "birthdate": "1990-05-15",
            "client_type": "particular",
            "status": "lead",
            "origin": "google",
            "tags": ["test", "novo"],
            "notes": "criado por teste",
            "favorite": False,
        }
        r = api_client.post(f"{BASE_URL}/api/clients", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["birthdate"] == "1990-05-15"
        assert data["status"] == "lead"
        assert data["origin"] == "google"
        assert data["tags"] == ["test", "novo"]
        assert data["favorite"] is False
        assert "id" in data
        TestClients.created_id = data["id"]

    def test_get_client_by_id(self, api_client):
        assert TestClients.created_id
        r = api_client.get(f"{BASE_URL}/api/clients/{TestClients.created_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == TestClients.created_id

    def test_get_client_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/clients/nonexistent-xyz", timeout=15)
        assert r.status_code == 404

    def test_toggle_favorite(self, api_client):
        assert TestClients.created_id
        r1 = api_client.patch(f"{BASE_URL}/api/clients/{TestClients.created_id}/favorite", timeout=15)
        assert r1.status_code == 200
        assert r1.json()["favorite"] is True
        # toggle back
        r2 = api_client.patch(f"{BASE_URL}/api/clients/{TestClients.created_id}/favorite", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["favorite"] is False

    def test_update_client(self, api_client):
        assert TestClients.created_id
        payload = {"name": "TEST_Cliente_Updated", "email": "u@x.pt", "status": "ativo", "tags": ["upd"]}
        r = api_client.put(f"{BASE_URL}/api/clients/{TestClients.created_id}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Cliente_Updated"
        # Verify persistence
        g = api_client.get(f"{BASE_URL}/api/clients/{TestClients.created_id}", timeout=15)
        assert g.json()["status"] == "ativo"

    def test_delete_client(self, api_client):
        assert TestClients.created_id
        r = api_client.delete(f"{BASE_URL}/api/clients/{TestClients.created_id}", timeout=15)
        assert r.status_code == 200
        g = api_client.get(f"{BASE_URL}/api/clients/{TestClients.created_id}", timeout=15)
        assert g.status_code == 404


# ---------------- Sessions ----------------
class TestSessions:
    sid = None

    def test_list_sessions_seed(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/sessions", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5, "seed must create 5 sessions"

    def test_create_session(self, api_client):
        payload = {
            "title": "TEST_Sessao",
            "type": "retrato",
            "client_name": "TEST_Cli",
            "date": "2026-09-10",
            "time": "10:00",
            "location": "Lisboa",
            "status": "agendada",
            "photographer": "Estúdio",
            "value": 450,
        }
        r = api_client.post(f"{BASE_URL}/api/sessions", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Sessao"
        assert data["value"] == 450
        assert data["status"] == "agendada"
        TestSessions.sid = data["id"]

    def test_update_session(self, api_client):
        assert TestSessions.sid
        payload = {"title": "TEST_Sessao_Upd", "type": "retrato", "client_name": "TEST_Cli",
                   "date": "2026-09-11", "value": 500, "status": "confirmada"}
        r = api_client.put(f"{BASE_URL}/api/sessions/{TestSessions.sid}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Sessao_Upd"
        assert r.json()["value"] == 500

    def test_patch_status(self, api_client):
        assert TestSessions.sid
        r = api_client.patch(f"{BASE_URL}/api/sessions/{TestSessions.sid}/status",
                             json={"status": "realizada"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "realizada"

    def test_delete_session(self, api_client):
        assert TestSessions.sid
        r = api_client.delete(f"{BASE_URL}/api/sessions/{TestSessions.sid}", timeout=15)
        assert r.status_code == 200


# ---------------- Galleries ----------------
class TestGalleries:
    gid = None
    pid = None

    def test_seed_galleries(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/galleries", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 3, "seed must create 3 galleries"

    def test_create_gallery(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/galleries",
                            json={"title": "TEST_Galeria", "client_name": "TEST_Cli"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Galeria"
        assert data["photos"] == []
        assert data["status"] == "pendente"
        TestGalleries.gid = data["id"]

    def test_add_photo_sets_cover(self, api_client):
        url = "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        r = api_client.post(f"{BASE_URL}/api/galleries/{TestGalleries.gid}/photos",
                            json={"url": url, "name": "one.jpg"}, timeout=15)
        assert r.status_code == 200
        g = r.json()
        assert len(g["photos"]) == 1
        assert g["cover"] == url
        TestGalleries.pid = g["photos"][0]["id"]

    def test_patch_gallery_status(self, api_client):
        r = api_client.patch(f"{BASE_URL}/api/galleries/{TestGalleries.gid}/status",
                             json={"status": "entregue"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "entregue"

    def test_get_gallery_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/galleries/nonexistent-id-xyz", timeout=15)
        assert r.status_code == 404

    def test_delete_photo(self, api_client):
        r = api_client.delete(
            f"{BASE_URL}/api/galleries/{TestGalleries.gid}/photos/{TestGalleries.pid}", timeout=15)
        assert r.status_code == 200
        assert len(r.json()["photos"]) == 0

    def test_delete_gallery(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/galleries/{TestGalleries.gid}", timeout=15)
        assert r.status_code == 200


class TestAISelect:
    """AI selection on a seeded gallery — LLM call may take 10-60s."""

    def test_ai_select_empty_gallery_returns_400(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/galleries", json={"title": "TEST_Empty_AI"}, timeout=15)
        assert r.status_code == 200
        gid = r.json()["id"]
        try:
            r2 = api_client.post(f"{BASE_URL}/api/galleries/{gid}/ai-select", timeout=30)
            assert r2.status_code == 400
        finally:
            api_client.delete(f"{BASE_URL}/api/galleries/{gid}", timeout=15)

    def test_ai_select_on_seeded_gallery(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/galleries", timeout=15)
        assert r.status_code == 200
        target = next((g for g in r.json() if g.get("photos")), None)
        if not target:
            pytest.skip("No seeded gallery with photos found")
        r2 = api_client.post(f"{BASE_URL}/api/galleries/{target['id']}/ai-select", timeout=240)
        assert r2.status_code == 200, f"AI select failed: {r2.status_code} {r2.text[:400]}"
        photos = r2.json().get("photos", [])
        assert len(photos) == len(target["photos"])
        for p in photos:
            assert p.get("ai_score") is not None
            assert isinstance(p.get("ai_tags"), list)
            assert p.get("ai_reason") is not None
        assert any(p.get("ai_selected") for p in photos)


# ---------------- Invoices ----------------
class TestInvoices:
    iid = None

    def test_create_invoice_totals(self, api_client):
        payload = {
            "client_name": "TEST_Cliente_Inv",
            "type": "fatura",
            "status": "pendente",
            "due_date": "2026-08-15",
            "items": [
                {"description": "Serviço A", "quantity": 2, "price": 100},
                {"description": "Serviço B", "quantity": 1, "price": 50},
            ],
            "tax_rate": 23,
        }
        r = api_client.post(f"{BASE_URL}/api/invoices", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["subtotal"] == 250.0
        assert data["tax"] == 57.5
        assert data["total"] == 307.5
        TestInvoices.iid = data["id"]

    def test_list_invoices_has_totals(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/invoices", timeout=15)
        assert r.status_code == 200
        for inv in r.json():
            assert "subtotal" in inv and "tax" in inv and "total" in inv

    def test_update_status(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/invoices/{TestInvoices.iid}/status",
                           json={"status": "paga"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "paga"

    def test_delete_invoice(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/invoices/{TestInvoices.iid}", timeout=15)
        assert r.status_code == 200
