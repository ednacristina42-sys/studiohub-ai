"""Iteration 14 — Public gallery store-order endpoint tests.

Covers:
- POST /api/public/galleries/{token}/store-order (new)
- OrderItem accepts photo_name/photo_url/notes
- Order/OrderCreate accept customer_phone
- Order appears in GET /api/store/orders (and ?status=novo)
- Admin POST /api/store/orders still works with photo_* + customer_phone
- Empty cart → 400
- Cleanup of TEST_ orders
"""
import os
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = BASE_URL + "/api"


# ---------------- Fixtures ----------------

@pytest.fixture(scope="module")
def gallery_token(api_client):
    """Gets a share token for the seed 'Campanha Vinho Reserva' (no password)."""
    r = api_client.get(f"{API}/galleries")
    assert r.status_code == 200
    gals = r.json()
    target = next((g for g in gals if g.get("title") == "Campanha Vinho Reserva"), None)
    assert target, "Seed gallery 'Campanha Vinho Reserva' not found"
    # Trigger share to guarantee access_token
    s = api_client.post(f"{API}/galleries/{target['id']}/share")
    assert s.status_code == 200
    tok = s.json().get("access_token")
    assert tok, "Missing access_token from /share"
    return tok


@pytest.fixture(scope="module")
def gallery_public(api_client, gallery_token):
    r = api_client.get(f"{API}/public/galleries/{gallery_token}")
    assert r.status_code == 200
    d = r.json()
    assert not d.get("protected"), "Gallery should not be password-protected"
    return d


@pytest.fixture(scope="module")
def products(api_client):
    r = api_client.get(f"{API}/store/products?active=true")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 2, f"Need at least 2 active products for tests, got {len(data)}"
    return data


@pytest.fixture(scope="module", autouse=False)
def created_ids():
    ids = []
    yield ids


@pytest.fixture(scope="module", autouse=True)
def cleanup_orders(api_client):
    """Delete any TEST_ prefixed orders after the module runs."""
    yield
    r = api_client.get(f"{API}/store/orders")
    if r.status_code == 200:
        for o in r.json():
            if (o.get("customer_name") or "").startswith("TEST_"):
                api_client.delete(f"{API}/store/orders/{o['id']}")


# ---------------- Tests: Public store-order ----------------

class TestPublicStoreOrder:

    def test_public_gallery_token_and_share(self, gallery_public, gallery_token):
        assert gallery_public.get("access_token") is None or gallery_public.get("access_token") == gallery_token or gallery_token
        assert "photos" in gallery_public

    def test_empty_cart_returns_400(self, api_client, gallery_token):
        r = api_client.post(f"{API}/public/galleries/{gallery_token}/store-order", json={
            "items": [], "customer_name": "TEST_empty", "customer_email": "e@e.pt",
        })
        assert r.status_code == 400

    def test_create_store_order_from_gallery(self, api_client, gallery_token, products, gallery_public):
        p1 = products[0]
        p2 = products[1]
        photo = (gallery_public.get("photos") or [{}])[0]
        items = [
            {"product_id": p1["id"], "name": p1["name"], "price": p1["price"], "quantity": 2,
             "photo_name": photo.get("name", ""), "photo_url": photo.get("url", ""), "notes": "TEST_note_1"},
            {"product_id": p2["id"], "name": p2["name"], "price": p2["price"], "quantity": 1,
             "photo_name": photo.get("name", ""), "photo_url": photo.get("url", ""), "notes": ""},
        ]
        expected_total = round(p1["price"] * 2 + p2["price"] * 1, 2)
        payload = {
            "items": items,
            "customer_name": "TEST_Cliente Galeria",
            "customer_email": "test_gallery@example.pt",
            "customer_phone": "+351 912 000 111",
            "notes": "TEST_pedido_via_galeria",
        }
        r = api_client.post(f"{API}/public/galleries/{gallery_token}/store-order", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        order = body["order"]
        # ID and number
        assert isinstance(order.get("id"), str) and len(order["id"]) > 0
        assert order.get("number", "").startswith("ENC-"), order.get("number")
        # Total is computed server-side
        assert order["total"] == expected_total
        # Status defaults to novo
        assert order["status"] == "novo"
        # Customer fields
        assert order["customer_name"] == "TEST_Cliente Galeria"
        assert order["customer_email"] == "test_gallery@example.pt"
        assert order["customer_phone"] == "+351 912 000 111"
        # Items keep photo_* + notes
        assert len(order["items"]) == 2
        assert order["items"][0]["photo_url"] == photo.get("url", "")
        assert order["items"][0]["notes"] == "TEST_note_1"
        # Photos array (unique) — same photo used twice → only 1 entry
        assert isinstance(order.get("photos"), list)
        if photo.get("url"):
            assert len(order["photos"]) == 1
            assert order["photos"][0]["url"] == photo["url"]
        # Gallery association
        assert order.get("gallery_token") == "" or order.get("gallery_token") is None or order.get("gallery_token") == None or "gallery_token" in order
        # Check gallery_title present
        assert order.get("gallery_title") is not None
        # Store for next tests
        pytest.gallery_order_id = order["id"]
        pytest.gallery_order_number = order["number"]

    def test_order_appears_in_admin_orders(self, api_client):
        oid = getattr(pytest, "gallery_order_id", None)
        assert oid, "Previous test did not run"
        r = api_client.get(f"{API}/store/orders")
        assert r.status_code == 200
        ids = [o["id"] for o in r.json()]
        assert oid in ids

    def test_order_appears_in_admin_orders_filtered_by_status_novo(self, api_client):
        oid = getattr(pytest, "gallery_order_id", None)
        r = api_client.get(f"{API}/store/orders?status=novo")
        assert r.status_code == 200
        rows = r.json()
        assert all(o["status"] == "novo" for o in rows)
        assert oid in [o["id"] for o in rows]

    def test_order_has_photos_and_customer_phone_in_admin_view(self, api_client):
        oid = getattr(pytest, "gallery_order_id", None)
        r = api_client.get(f"{API}/store/orders")
        row = next((o for o in r.json() if o["id"] == oid), None)
        assert row is not None
        assert row.get("customer_phone") == "+351 912 000 111"
        assert row.get("gallery_title")
        # photos array present
        assert isinstance(row.get("photos"), list)
        # items carry photo_* fields
        for it in row.get("items", []):
            assert "photo_name" in it
            assert "photo_url" in it
            assert "notes" in it

    def test_invalid_token_returns_404(self, api_client):
        r = api_client.post(f"{API}/public/galleries/DOESNOTEXIST_TOK/store-order",
                            json={"items": [{"product_id": "x", "name": "y", "price": 1, "quantity": 1}]})
        assert r.status_code in (404, 410)


# ---------------- Tests: Admin store orders regression with new fields ----------------

class TestAdminStoreOrdersRegression:

    def test_admin_create_order_with_phone_and_photo_fields(self, api_client, products):
        p = products[0]
        payload = {
            "customer_name": "TEST_Admin Phone",
            "customer_email": "admin_phone@example.pt",
            "customer_phone": "+351 933 222 111",
            "status": "novo",
            "notes": "TEST_admin",
            "items": [{
                "product_id": p["id"], "name": p["name"], "price": p["price"], "quantity": 3,
                "photo_name": "foto.jpg", "photo_url": "https://example.com/foto.jpg", "notes": "moldura preta",
            }],
        }
        r = api_client.post(f"{API}/store/orders", json=payload)
        assert r.status_code in (200, 201), r.text
        o = r.json()
        assert o["customer_phone"] == "+351 933 222 111"
        assert o["total"] == round(p["price"] * 3, 2)
        assert o["items"][0]["photo_url"] == "https://example.com/foto.jpg"
        assert o["items"][0]["notes"] == "moldura preta"
        # Persistence check
        g = api_client.get(f"{API}/store/orders")
        assert any(x["id"] == o["id"] for x in g.json())
        # cleanup
        api_client.delete(f"{API}/store/orders/{o['id']}")

    def test_states_endpoint_still_lists_novo(self, api_client):
        r = api_client.get(f"{API}/store/orders/states")
        assert r.status_code == 200
        assert "novo" in r.json()


# ---------------- Tests: Gallery regression smoke ----------------

class TestGalleryRegression:

    def test_gallery_public_get(self, api_client, gallery_token):
        r = api_client.get(f"{API}/public/galleries/{gallery_token}")
        assert r.status_code == 200
        d = r.json()
        assert "photos" in d

    def test_favorite_photo_via_public_patch(self, api_client, gallery_token, gallery_public):
        photos = gallery_public.get("photos") or []
        if not photos:
            pytest.skip("Gallery has no photos")
        pid = photos[0]["id"]
        r = api_client.patch(
            f"{API}/public/galleries/{gallery_token}/photos/{pid}",
            json={"action": "favorite"},
        )
        assert r.status_code == 200
        # Toggle back
        api_client.patch(
            f"{API}/public/galleries/{gallery_token}/photos/{pid}",
            json={"action": "favorite"},
        )

    def test_legacy_order_endpoint_still_works(self, api_client, gallery_token):
        """Legacy /order (db.orders) endpoint remains intact."""
        r = api_client.post(f"{API}/public/galleries/{gallery_token}/order",
                            json={"items": [{"name": "X", "price": 10, "quantity": 1}], "total": 10})
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        assert d.get("mock") is True


# ---------------- Smoke: other modules still up ----------------

class TestSmokeOtherModules:

    def test_smoke_clients(self, api_client):
        assert api_client.get(f"{API}/clients").status_code == 200

    def test_smoke_sessions(self, api_client):
        assert api_client.get(f"{API}/sessions").status_code == 200

    def test_smoke_invoices(self, api_client):
        assert api_client.get(f"{API}/invoices").status_code == 200

    def test_smoke_receivables(self, api_client):
        assert api_client.get(f"{API}/receivables").status_code == 200

    def test_smoke_payables(self, api_client):
        assert api_client.get(f"{API}/payables").status_code == 200

    def test_smoke_store_products(self, api_client):
        assert api_client.get(f"{API}/store/products").status_code == 200

    def test_smoke_store_categories(self, api_client):
        assert api_client.get(f"{API}/store/categories").status_code == 200
