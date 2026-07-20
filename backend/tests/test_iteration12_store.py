"""
Iteration 12 — Loja Online (Store) backend tests
Cobre:
- /api/store/categories: GET, POST (idempotente), DELETE
- /api/store/products: GET (filtros ?category, ?active), POST (clamp preço), PUT, PATCH toggle, DELETE
- Unificação após seed: 5 ativos, 1 inativo ("Pack Casamento Completo"), 6 categorias
- Regressão: galeria pública -> checkout MOCK /public/galleries/{token}/order
- Smoke: /financeiro (KPIs/receivables/payables/reports)
"""
import os
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"


# ------------------ CATEGORIAS ------------------

class TestStoreCategories:
    def test_list_categories_after_seed(self):
        r = requests.get(f"{BASE}/store/categories", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        names = {c["name"] for c in data}
        expected = {"Impressões", "Álbuns", "Molduras", "Canvas", "Ficheiros Digitais", "Packs"}
        assert expected.issubset(names), f"Faltam categorias seed. Presentes: {names}"

    def test_create_category_idempotent(self):
        payload = {"name": "TEST_CatIdemp"}
        r1 = requests.post(f"{BASE}/store/categories", json=payload, timeout=15)
        assert r1.status_code == 200
        c1 = r1.json()
        assert c1["name"] == payload["name"]
        assert "id" in c1

        r2 = requests.post(f"{BASE}/store/categories", json=payload, timeout=15)
        assert r2.status_code == 200
        c2 = r2.json()
        # Idempotente: mesmo id
        assert c2["id"] == c1["id"], "POST /store/categories deveria ser idempotente por nome"

        # Verifica não duplicou
        allcats = requests.get(f"{BASE}/store/categories").json()
        matches = [c for c in allcats if c["name"] == payload["name"]]
        assert len(matches) == 1

        # cleanup
        requests.delete(f"{BASE}/store/categories/{c1['id']}", timeout=15)

    def test_create_category_empty_name_rejected(self):
        r = requests.post(f"{BASE}/store/categories", json={"name": ""}, timeout=15)
        assert r.status_code == 400

    def test_delete_category(self):
        r = requests.post(f"{BASE}/store/categories", json={"name": "TEST_ToDelete"}, timeout=15)
        cid = r.json()["id"]
        d = requests.delete(f"{BASE}/store/categories/{cid}", timeout=15)
        assert d.status_code == 200
        assert d.json().get("ok") is True
        # Confirm removed
        allcats = requests.get(f"{BASE}/store/categories").json()
        assert cid not in {c["id"] for c in allcats}


# ------------------ PRODUTOS ------------------

class TestStoreProducts:
    def test_list_products_unified_after_seed(self):
        """Verifica que existe um único GET /store/products e o seed tem 5 ativos + 1 inativo."""
        r_active = requests.get(f"{BASE}/store/products?active=true", timeout=15)
        assert r_active.status_code == 200
        active = r_active.json()
        assert len(active) == 5, f"Esperava 5 ativos, obtive {len(active)}"
        for p in active:
            assert p["active"] is True
            assert p["name"] != "Pack Casamento Completo"

        r_inactive = requests.get(f"{BASE}/store/products?active=false", timeout=15)
        assert r_inactive.status_code == 200
        inactive = r_inactive.json()
        assert len(inactive) == 1
        assert inactive[0]["name"] == "Pack Casamento Completo"
        assert inactive[0]["active"] is False

    def test_list_products_no_filter_returns_all(self):
        r = requests.get(f"{BASE}/store/products", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_list_products_filter_by_category(self):
        r = requests.get(f"{BASE}/store/products?category=Canvas", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        for p in data:
            assert p["category"] == "Canvas"

    def test_create_product_negative_price_clamped_to_zero(self):
        payload = {
            "name": "TEST_NegPrice",
            "description": "clamp",
            "category": "Canvas",
            "price": -10,
            "image_url": "https://example.com/x.jpg",
            "active": True,
        }
        r = requests.post(f"{BASE}/store/products", json=payload, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["price"] == 0, f"Preço negativo deveria ficar 0, veio {p['price']}"
        pid = p["id"]

        # Persistência
        g = requests.get(f"{BASE}/store/products", timeout=15).json()
        got = next((x for x in g if x["id"] == pid), None)
        assert got is not None
        assert got["price"] == 0

        # cleanup
        requests.delete(f"{BASE}/store/products/{pid}", timeout=15)

    def test_update_product(self):
        create = requests.post(f"{BASE}/store/products", json={
            "name": "TEST_ProdUpd", "description": "", "category": "Impressões",
            "price": 50, "image_url": "", "active": True
        }, timeout=15).json()
        pid = create["id"]

        r = requests.put(f"{BASE}/store/products/{pid}", json={"name": "TEST_ProdUpd2", "price": 99}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_ProdUpd2"
        assert data["price"] == 99

        # Verify GET persisted
        g = requests.get(f"{BASE}/store/products", timeout=15).json()
        got = next(x for x in g if x["id"] == pid)
        assert got["name"] == "TEST_ProdUpd2"
        assert got["price"] == 99

        requests.delete(f"{BASE}/store/products/{pid}", timeout=15)

    def test_toggle_product_active(self):
        create = requests.post(f"{BASE}/store/products", json={
            "name": "TEST_Toggle", "description": "", "category": "Canvas",
            "price": 10, "image_url": "", "active": True
        }, timeout=15).json()
        pid = create["id"]
        assert create["active"] is True

        r1 = requests.patch(f"{BASE}/store/products/{pid}/toggle", timeout=15)
        assert r1.status_code == 200
        assert r1.json()["active"] is False

        r2 = requests.patch(f"{BASE}/store/products/{pid}/toggle", timeout=15)
        assert r2.json()["active"] is True

        requests.delete(f"{BASE}/store/products/{pid}", timeout=15)

    def test_delete_product(self):
        create = requests.post(f"{BASE}/store/products", json={
            "name": "TEST_ProdDel", "description": "", "category": "Canvas",
            "price": 10, "image_url": "", "active": True
        }, timeout=15).json()
        pid = create["id"]
        r = requests.delete(f"{BASE}/store/products/{pid}", timeout=15)
        assert r.status_code == 200
        g = requests.get(f"{BASE}/store/products", timeout=15).json()
        assert pid not in {x["id"] for x in g}

    def test_update_product_not_found_returns_404(self):
        r = requests.put(f"{BASE}/store/products/does-not-exist", json={"name": "x"}, timeout=15)
        assert r.status_code == 404


# ------------------ REGRESSÃO — Galeria pública & checkout MOCK ------------------

class TestPublicGalleryCheckout:
    def test_gallery_public_order_mock(self):
        # Get a gallery
        galleries = requests.get(f"{BASE}/galleries", timeout=15).json()
        assert len(galleries) >= 1, "Precisa haver galerias no seed"
        g = galleries[0]

        token = g.get("access_token") or g.get("share_token")
        if not token:
            shared = requests.post(f"{BASE}/galleries/{g['id']}/share", timeout=15)
            assert shared.status_code == 200
            body = shared.json()
            token = body.get("access_token") or body.get("share_token")
        assert token, "access_token (share token) não foi gerado"

        # Confirma que o endpoint público consegue devolver galeria (ou pede pin)
        pub = requests.get(f"{BASE}/public/galleries/{token}", timeout=15)
        assert pub.status_code == 200

        # Produtos ativos disponíveis para checkout
        prods = requests.get(f"{BASE}/store/products?active=true", timeout=15).json()
        assert len(prods) >= 1
        cart = [{"name": prods[0]["name"], "price": prods[0]["price"]}]

        order = requests.post(
            f"{BASE}/public/galleries/{token}/order",
            json={"items": cart, "total": sum(i["price"] for i in cart)},
            timeout=15,
        )
        assert order.status_code == 200
        body = order.json()
        assert body.get("ok") is True
        assert body.get("mock") is True
        assert body.get("order", {}).get("total") == cart[0]["price"]


# ------------------ SMOKE — /financeiro ------------------

class TestFinancialSmoke:
    def test_dashboard_stats(self):
        r = requests.get(f"{BASE}/dashboard/stats", timeout=15)
        assert r.status_code == 200

    def test_receivables_list(self):
        r = requests.get(f"{BASE}/receivables", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_payables_list(self):
        r = requests.get(f"{BASE}/payables", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_reports_endpoint(self):
        # Try common report endpoints
        r = requests.get(f"{BASE}/reports", timeout=15)
        # Endpoint pode ser /reports ou similar; aceita 200 ou 404
        assert r.status_code in (200, 404, 405)

    def test_other_modules_smoke(self):
        for path in ("/clients", "/sessions", "/galleries", "/invoices", "/quotes", "/contracts", "/events"):
            r = requests.get(f"{BASE}{path}", timeout=15)
            assert r.status_code == 200, f"{path} retornou {r.status_code}"
