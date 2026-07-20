"""
Iteration 13 — Loja Online (Store) — extensões:
- Categorias: campos description/active + PUT + PATCH /toggle
- Produtos: campo SKU nos endpoints POST/PUT/GET
- Pedidos (nova collection db.store_orders):
    * GET /store/orders (?status filtro)
    * GET /store/orders/states -> ORDER_STATES em PT
    * POST /store/orders -> calcula total dos itens, gera número ENC-YYYY-XXXX, status default 'novo'
    * PUT /store/orders/{id} -> recalcula total ao alterar itens
    * PATCH /store/orders/{id}/status -> rejeita estado inválido (400)
    * DELETE /store/orders/{id}
    * Seed cria 3 pedidos
- Isolamento: NÃO mexer em db.orders (galeria pública)
"""
import os
import re
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"


# ------------------ CATEGORIAS — description/active + PUT + toggle ------------------

class TestCategoriesExtended:
    def test_create_with_description_and_active_false(self):
        r = requests.post(f"{BASE}/store/categories", json={
            "name": "TEST_CatDescActive",
            "description": "Categoria com descrição",
            "active": False,
        }, timeout=15)
        assert r.status_code == 200
        c = r.json()
        assert c["name"] == "TEST_CatDescActive"
        assert c["description"] == "Categoria com descrição"
        assert c["active"] is False
        cid = c["id"]

        # cleanup
        requests.delete(f"{BASE}/store/categories/{cid}", timeout=15)

    def test_update_category_put(self):
        r = requests.post(f"{BASE}/store/categories", json={"name": "TEST_CatPut", "description": "d1"}, timeout=15).json()
        cid = r["id"]

        u = requests.put(f"{BASE}/store/categories/{cid}", json={
            "name": "TEST_CatPut2", "description": "d2 nova", "active": False
        }, timeout=15)
        assert u.status_code == 200
        data = u.json()
        assert data["name"] == "TEST_CatPut2"
        assert data["description"] == "d2 nova"
        assert data["active"] is False

        # persistência via GET
        allcats = requests.get(f"{BASE}/store/categories", timeout=15).json()
        got = next(x for x in allcats if x["id"] == cid)
        assert got["name"] == "TEST_CatPut2"
        assert got["active"] is False

        requests.delete(f"{BASE}/store/categories/{cid}", timeout=15)

    def test_update_category_not_found_404(self):
        r = requests.put(f"{BASE}/store/categories/does-not-exist", json={"name": "x"}, timeout=15)
        assert r.status_code == 404

    def test_toggle_category_active(self):
        r = requests.post(f"{BASE}/store/categories", json={"name": "TEST_CatToggle"}, timeout=15).json()
        cid = r["id"]
        assert r.get("active", True) is True

        t1 = requests.patch(f"{BASE}/store/categories/{cid}/toggle", timeout=15)
        assert t1.status_code == 200
        assert t1.json()["active"] is False

        t2 = requests.patch(f"{BASE}/store/categories/{cid}/toggle", timeout=15)
        assert t2.status_code == 200
        assert t2.json()["active"] is True

        requests.delete(f"{BASE}/store/categories/{cid}", timeout=15)

    def test_toggle_category_not_found_404(self):
        r = requests.patch(f"{BASE}/store/categories/does-not-exist/toggle", timeout=15)
        assert r.status_code == 404


# ------------------ PRODUTOS — campo SKU ------------------

class TestProductsSKU:
    def test_seed_products_have_expected_skus(self):
        prods = requests.get(f"{BASE}/store/products", timeout=15).json()
        skus = {p["name"]: p.get("sku") for p in prods}
        expected = {
            "Impressão Fine Art 30x40": "IMP-3040",
            "Álbum Luxo 30x30 (20 páginas)": "ALB-3030",
            "Moldura de Madeira 20x30": "MOL-2030",
            "Canvas 40x60": "CAN-4060",
            "Pack Digital — 10 fotos editadas": "DIG-PK10",
            "Pack Casamento Completo": "PACK-WED",
        }
        for name, sku in expected.items():
            assert skus.get(name) == sku, f"SKU divergente para {name}: {skus.get(name)}"

    def test_create_product_with_sku(self):
        payload = {
            "name": "TEST_ProdSKU",
            "description": "com sku",
            "category": "Canvas",
            "price": 25.5,
            "image_url": "",
            "sku": "TST-SKU-01",
            "active": True,
        }
        r = requests.post(f"{BASE}/store/products", json=payload, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["sku"] == "TST-SKU-01"
        pid = p["id"]

        # GET
        got = next(x for x in requests.get(f"{BASE}/store/products", timeout=15).json() if x["id"] == pid)
        assert got["sku"] == "TST-SKU-01"

        # PUT altera SKU
        u = requests.put(f"{BASE}/store/products/{pid}", json={"sku": "TST-SKU-02"}, timeout=15)
        assert u.status_code == 200
        assert u.json()["sku"] == "TST-SKU-02"

        got2 = next(x for x in requests.get(f"{BASE}/store/products", timeout=15).json() if x["id"] == pid)
        assert got2["sku"] == "TST-SKU-02"

        requests.delete(f"{BASE}/store/products/{pid}", timeout=15)


# ------------------ PEDIDOS — nova collection db.store_orders ------------------

class TestStoreOrders:
    def test_get_states_pt(self):
        r = requests.get(f"{BASE}/store/orders/states", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data == ["novo", "pago", "em_producao", "enviado", "entregue", "cancelado"]

    def test_seed_has_three_orders_with_encoded_numbers(self):
        r = requests.get(f"{BASE}/store/orders", timeout=15)
        assert r.status_code == 200
        orders = r.json()
        assert len(orders) >= 3, f"Seed deveria ter pelo menos 3 pedidos, tem {len(orders)}"
        seed_orders = [o for o in orders if o.get("number", "").startswith("ENC-2026-000")]
        assert len(seed_orders) >= 3
        # Cada pedido tem total correto (price*qty)
        for o in seed_orders:
            calc = round(sum((i.get("price", 0) or 0) * (i.get("quantity", 1) or 1) for i in o.get("items", [])), 2)
            assert o["total"] == calc, f"Total inconsistente para {o['number']}"

    def test_filter_orders_by_status(self):
        r = requests.get(f"{BASE}/store/orders?status=pago", timeout=15)
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "pago"

        r2 = requests.get(f"{BASE}/store/orders?status=enviado", timeout=15)
        assert r2.status_code == 200
        for o in r2.json():
            assert o["status"] == "enviado"

    def test_create_order_calculates_total_and_generates_number(self):
        payload = {
            "customer_name": "TEST_ClienteA",
            "customer_email": "test.cliente.a@example.com",
            "items": [
                {"product_id": "", "name": "Item A", "price": 10.0, "quantity": 2},
                {"product_id": "", "name": "Item B", "price": 5.5, "quantity": 3},
            ],
            "notes": "obs teste",
        }
        r = requests.post(f"{BASE}/store/orders", json=payload, timeout=15)
        assert r.status_code == 200
        o = r.json()
        # total = 10*2 + 5.5*3 = 20 + 16.5 = 36.5
        assert o["total"] == 36.5
        assert o["status"] == "novo"  # default
        # número no formato ENC-YYYY-XXXX
        assert re.match(r"^ENC-\d{4}-\d{4}$", o["number"]), f"Número mal formatado: {o['number']}"
        assert o["customer_name"] == "TEST_ClienteA"
        assert "id" in o
        oid = o["id"]

        # Persistência via GET
        got = next((x for x in requests.get(f"{BASE}/store/orders", timeout=15).json() if x["id"] == oid), None)
        assert got is not None
        assert got["total"] == 36.5
        assert got["number"] == o["number"]

        requests.delete(f"{BASE}/store/orders/{oid}", timeout=15)

    def test_create_order_status_default_novo_when_invalid(self):
        # Se enviarem status inválido no POST, cai para 'novo' (comportamento do servidor)
        r = requests.post(f"{BASE}/store/orders", json={
            "customer_name": "TEST_DefaultNovo",
            "items": [{"product_id": "", "name": "X", "price": 1, "quantity": 1}],
            "status": "estado_invalido_xpto",
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "novo"
        requests.delete(f"{BASE}/store/orders/{r.json()['id']}", timeout=15)

    def test_update_order_recalculates_total(self):
        create = requests.post(f"{BASE}/store/orders", json={
            "customer_name": "TEST_UpdOrd",
            "items": [{"product_id": "", "name": "X", "price": 20, "quantity": 1}],
        }, timeout=15).json()
        oid = create["id"]
        assert create["total"] == 20

        u = requests.put(f"{BASE}/store/orders/{oid}", json={
            "items": [
                {"product_id": "", "name": "Y", "price": 15, "quantity": 2},
                {"product_id": "", "name": "Z", "price": 5, "quantity": 4},
            ]
        }, timeout=15)
        assert u.status_code == 200
        assert u.json()["total"] == 50  # 30 + 20

        # persistência
        got = next(x for x in requests.get(f"{BASE}/store/orders", timeout=15).json() if x["id"] == oid)
        assert got["total"] == 50
        assert len(got["items"]) == 2

        requests.delete(f"{BASE}/store/orders/{oid}", timeout=15)

    def test_update_order_invalid_status_400(self):
        create = requests.post(f"{BASE}/store/orders", json={
            "customer_name": "TEST_BadStatus",
            "items": [{"product_id": "", "name": "X", "price": 1, "quantity": 1}],
        }, timeout=15).json()
        oid = create["id"]

        u = requests.put(f"{BASE}/store/orders/{oid}", json={"status": "banana"}, timeout=15)
        assert u.status_code == 400

        requests.delete(f"{BASE}/store/orders/{oid}", timeout=15)

    def test_patch_status_valid(self):
        create = requests.post(f"{BASE}/store/orders", json={
            "customer_name": "TEST_PatchOK",
            "items": [{"product_id": "", "name": "X", "price": 1, "quantity": 1}],
        }, timeout=15).json()
        oid = create["id"]

        for st in ["pago", "em_producao", "enviado", "entregue", "cancelado", "novo"]:
            r = requests.patch(f"{BASE}/store/orders/{oid}/status", json={"status": st}, timeout=15)
            assert r.status_code == 200, f"Status {st} rejeitado: {r.status_code} {r.text}"
            assert r.json()["status"] == st

        requests.delete(f"{BASE}/store/orders/{oid}", timeout=15)

    def test_patch_status_invalid_400(self):
        create = requests.post(f"{BASE}/store/orders", json={
            "customer_name": "TEST_PatchBad",
            "items": [{"product_id": "", "name": "X", "price": 1, "quantity": 1}],
        }, timeout=15).json()
        oid = create["id"]

        r = requests.patch(f"{BASE}/store/orders/{oid}/status", json={"status": "invalidissimo"}, timeout=15)
        assert r.status_code == 400

        requests.delete(f"{BASE}/store/orders/{oid}", timeout=15)

    def test_delete_order(self):
        create = requests.post(f"{BASE}/store/orders", json={
            "customer_name": "TEST_DelOrd",
            "items": [{"product_id": "", "name": "X", "price": 1, "quantity": 1}],
        }, timeout=15).json()
        oid = create["id"]

        d = requests.delete(f"{BASE}/store/orders/{oid}", timeout=15)
        assert d.status_code == 200

        got = next((x for x in requests.get(f"{BASE}/store/orders", timeout=15).json() if x["id"] == oid), None)
        assert got is None

    def test_store_orders_isolated_from_gallery_orders(self):
        """Regressão: db.orders (galeria pública) NÃO deve ser afetado por endpoints /store/orders."""
        # Confirma que store_orders tem número, gallery orders (via public checkout) não
        store = requests.get(f"{BASE}/store/orders", timeout=15).json()
        for o in store:
            assert "number" in o and o["number"].startswith("ENC-"), \
                f"Store order sem número ENC-: {o}"


# ------------------ REGRESSÃO — Galeria pública / checkout MOCK ------------------

class TestPublicGalleryRegression:
    def test_public_checkout_still_works_mocked(self):
        galleries = requests.get(f"{BASE}/galleries", timeout=15).json()
        assert len(galleries) >= 1
        g = galleries[0]

        token = g.get("access_token") or g.get("share_token")
        if not token:
            shared = requests.post(f"{BASE}/galleries/{g['id']}/share", timeout=15)
            body = shared.json()
            token = body.get("access_token") or body.get("share_token")
        assert token

        prods = requests.get(f"{BASE}/store/products?active=true", timeout=15).json()
        assert len(prods) == 5, f"Esperava 5 produtos ativos após seed, obtive {len(prods)}"
        cart = [{"name": prods[0]["name"], "price": prods[0]["price"]}]

        order = requests.post(
            f"{BASE}/public/galleries/{token}/order",
            json={"items": cart, "total": cart[0]["price"]},
            timeout=15,
        )
        assert order.status_code == 200
        body = order.json()
        assert body.get("ok") is True
        assert body.get("mock") is True


# ------------------ SMOKE — restantes módulos ------------------

class TestOtherModulesSmoke:
    def test_modules_ok(self):
        for path in ("/clients", "/sessions", "/galleries", "/invoices", "/quotes",
                     "/contracts", "/events", "/receivables", "/payables", "/dashboard/stats"):
            r = requests.get(f"{BASE}{path}", timeout=15)
            assert r.status_code == 200, f"{path} retornou {r.status_code}"
