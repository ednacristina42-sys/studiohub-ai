"""StudioHub AI — Backend API tests (pytest)

Covers:
 - Seed idempotency and dashboard stats
 - Clients / Projects / Events CRUD
 - Invoices CRUD + status update + totals math (subtotal/tax/total)
 - Galleries CRUD + photo add/delete
 - AI selection endpoint on a gallery with photos
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://photo-studio-pro-31.preview.emergentagent.com",
).rstrip("/")


# ---------- health / seed / dashboard ----------
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
        # After the first seed, the second call must be a no-op
        assert r2.json().get("seeded") is False

    def test_dashboard_stats_shape(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in [
            "clients", "projects", "active_projects", "galleries",
            "revenue", "pending", "upcoming_events", "revenue_chart", "project_status",
        ]:
            assert k in data, f"missing key {k}"
        assert isinstance(data["upcoming_events"], list)
        assert isinstance(data["revenue_chart"], list)
        assert isinstance(data["project_status"], list)
        # Seed data assertions
        assert data["clients"] >= 4
        assert data["projects"] >= 4
        assert data["galleries"] >= 2
        assert data["revenue"] > 0


# ---------- Clients ----------
class TestClients:
    created_id = None

    def test_list_clients(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_get_client(self, api_client):
        payload = {"name": "TEST_Cliente", "email": "test@example.com", "phone": "+351 900 000 000", "tags": ["test"]}
        r = api_client.post(f"{BASE_URL}/api/clients", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert "id" in data
        TestClients.created_id = data["id"]

        # verify list contains it
        r2 = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        assert any(c["id"] == TestClients.created_id for c in r2.json())

    def test_update_client(self, api_client):
        assert TestClients.created_id
        payload = {"name": "TEST_Cliente_Updated", "email": "u@x.pt", "tags": ["upd"]}
        r = api_client.put(f"{BASE_URL}/api/clients/{TestClients.created_id}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Cliente_Updated"

    def test_delete_client(self, api_client):
        assert TestClients.created_id
        r = api_client.delete(f"{BASE_URL}/api/clients/{TestClients.created_id}", timeout=15)
        assert r.status_code == 200
        # verify gone
        r2 = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        assert all(c["id"] != TestClients.created_id for c in r2.json())


# ---------- Projects ----------
class TestProjects:
    pid = None

    def test_create_project(self, api_client):
        p = {"title": "TEST_Projeto", "client_name": "TEST_Cli", "type": "sessao", "status": "planeado",
             "date": "2026-08-01", "location": "Lisboa", "budget": 500}
        r = api_client.post(f"{BASE_URL}/api/projects", json=p, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == p["title"]
        assert data["budget"] == 500
        TestProjects.pid = data["id"]

    def test_list_projects(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/projects", timeout=15)
        assert r.status_code == 200
        assert any(p["id"] == TestProjects.pid for p in r.json())

    def test_update_project(self, api_client):
        payload = {"title": "TEST_Projeto_Upd", "status": "em_curso", "budget": 900}
        r = api_client.put(f"{BASE_URL}/api/projects/{TestProjects.pid}", json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "em_curso"
        assert r.json()["budget"] == 900

    def test_delete_project(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/projects/{TestProjects.pid}", timeout=15)
        assert r.status_code == 200


# ---------- Events ----------
class TestEvents:
    eid = None

    def test_create_event(self, api_client):
        e = {"title": "TEST_Sessao", "client_name": "TEST_Cli", "date": "2026-09-10", "time": "11:00", "type": "sessao"}
        r = api_client.post(f"{BASE_URL}/api/events", json=e, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Sessao"
        TestEvents.eid = data["id"]

    def test_list_events(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/events", timeout=15)
        assert r.status_code == 200
        assert any(e["id"] == TestEvents.eid for e in r.json())

    def test_delete_event(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/events/{TestEvents.eid}", timeout=15)
        assert r.status_code == 200


# ---------- Invoices ----------
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
        assert data["client_name"] == payload["client_name"]
        # subtotal = 250; tax = 57.5; total = 307.5
        assert data["subtotal"] == 250.0
        assert data["tax"] == 57.5
        assert data["total"] == 307.5
        assert data["status"] == "pendente"
        assert data["number"].startswith(f"{__import__('datetime').datetime.now().year}-")
        TestInvoices.iid = data["id"]

    def test_list_invoices(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/invoices", timeout=15)
        assert r.status_code == 200
        assert any(i["id"] == TestInvoices.iid for i in r.json())
        # ensure list already contains computed totals
        for inv in r.json():
            assert "subtotal" in inv and "tax" in inv and "total" in inv

    def test_update_status(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/invoices/{TestInvoices.iid}/status", json={"status": "paga"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "paga"
        assert data["total"] == 307.5  # still consistent

    def test_delete_invoice(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/invoices/{TestInvoices.iid}", timeout=15)
        assert r.status_code == 200


# ---------- Galleries + Photos + AI ----------
class TestGalleries:
    gid = None
    pid = None

    def test_create_gallery(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/galleries", json={"title": "TEST_Galeria", "client_name": "TEST_Cli"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Galeria"
        assert data["photos"] == []
        TestGalleries.gid = data["id"]

    def test_add_photo(self, api_client):
        url = "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        r = api_client.post(f"{BASE_URL}/api/galleries/{TestGalleries.gid}/photos", json={"url": url, "name": "one.jpg"}, timeout=15)
        assert r.status_code == 200
        g = r.json()
        assert len(g["photos"]) == 1
        # cover should auto-set from first photo
        assert g["cover"] == url
        TestGalleries.pid = g["photos"][0]["id"]

    def test_get_gallery(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/galleries/{TestGalleries.gid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == TestGalleries.gid

    def test_get_gallery_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/galleries/nonexistent-id-xyz", timeout=15)
        assert r.status_code == 404

    def test_delete_photo(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/galleries/{TestGalleries.gid}/photos/{TestGalleries.pid}", timeout=15)
        assert r.status_code == 200
        assert len(r.json()["photos"]) == 0

    def test_delete_gallery(self, api_client):
        r = api_client.delete(f"{BASE_URL}/api/galleries/{TestGalleries.gid}", timeout=15)
        assert r.status_code == 200


class TestAISelect:
    """AI selection on a seeded gallery — LLM call may take 10-40s."""

    def test_ai_select_on_seeded_gallery(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/galleries", timeout=15)
        assert r.status_code == 200
        galleries = r.json()
        target = None
        for g in galleries:
            if g.get("photos"):
                target = g
                break
        if not target:
            pytest.skip("No seeded gallery with photos found")

        # allow generous timeout for LLM
        r2 = api_client.post(f"{BASE_URL}/api/galleries/{target['id']}/ai-select", timeout=180)
        assert r2.status_code == 200, f"AI select failed: {r2.status_code} {r2.text[:400]}"
        result = r2.json()
        photos = result.get("photos", [])
        assert len(photos) == len(target["photos"])
        # every photo should have ai_score / ai_tags / ai_reason populated
        for p in photos:
            assert p.get("ai_score") is not None
            assert isinstance(p.get("ai_score"), (int, float))
            assert isinstance(p.get("ai_tags"), list)
            assert p.get("ai_reason") is not None
        # at least one photo must be ai_selected
        assert any(p.get("ai_selected") for p in photos), "No photo marked ai_selected"
        # top ~40% rule => selected count should be >= 1 and <= total
        sel = sum(1 for p in photos if p.get("ai_selected"))
        assert 1 <= sel <= len(photos)

    def test_ai_select_empty_gallery_returns_400(self, api_client):
        # create empty gallery, then attempt AI select
        r = api_client.post(f"{BASE_URL}/api/galleries", json={"title": "TEST_Empty_AI"}, timeout=15)
        assert r.status_code == 200
        gid = r.json()["id"]
        try:
            r2 = api_client.post(f"{BASE_URL}/api/galleries/{gid}/ai-select", timeout=30)
            assert r2.status_code == 400
        finally:
            api_client.delete(f"{BASE_URL}/api/galleries/{gid}", timeout=15)


# Fixtures are provided by conftest.py
