"""
Phase 4 — Automação Pós-Venda
Backend contract tests (no Stripe live checkout).
E2E paid-flow triggered by Playwright is validated in the frontend layer.
"""
import os
import re
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Notifications ----------------
class TestNotifications:
    def test_list_notifications(self, sess):
        r = sess.get(f"{API}/notifications")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for n in data:
            assert "_id" not in n
            for k in ("id", "type", "title", "message", "read", "created_at"):
                assert k in n, f"missing {k}"

    def test_unread_count(self, sess):
        r = sess.get(f"{API}/notifications/unread-count")
        assert r.status_code == 200
        assert isinstance(r.json().get("count"), int)

    def test_mark_all_and_verify(self, sess):
        # Trigger creation of at least one notification by placing a new_order
        gs = sess.get(f"{API}/galleries").json()
        token = gs[0]["access_token"]
        # Get products for that gallery
        prods = sess.get(f"{API}/store/products?active=true").json()
        assert prods, "no products seeded"
        p = prods[0]
        payload = {
            "customer_name": "TEST_MarkAll",
            "customer_email": "delivered@resend.dev",
            "origin_url": BASE_URL,
            "items": [{
                "product_id": p["id"], "name": p["name"], "price": p["price"], "quantity": 1,
                "photo_name": "p.jpg", "photo_url": "https://placeholder.com/p.jpg",
            }],
        }
        r = sess.post(f"{API}/public/galleries/{token}/store-order", json=payload)
        assert r.status_code == 200
        # verify count>0
        c = sess.get(f"{API}/notifications/unread-count").json()["count"]
        assert c >= 1
        # mark-all
        r2 = sess.post(f"{API}/notifications/read-all")
        assert r2.status_code == 200
        assert sess.get(f"{API}/notifications/unread-count").json()["count"] == 0

    def test_mark_one(self, sess):
        # create one notification via new order
        gs = sess.get(f"{API}/galleries").json()
        token = gs[0]["access_token"]
        prods = sess.get(f"{API}/store/products?active=true").json()
        payload = {
            "customer_name": "TEST_MarkOne",
            "customer_email": "delivered@resend.dev",
            "origin_url": BASE_URL,
            "items": [{
                "product_id": prods[0]["id"], "name": prods[0]["name"], "price": prods[0]["price"],
                "quantity": 1, "photo_name": "p.jpg", "photo_url": "https://p/p.jpg",
            }],
        }
        sess.post(f"{API}/public/galleries/{token}/store-order", json=payload)
        notifs = sess.get(f"{API}/notifications").json()
        assert notifs, "expected new notifications"
        unread = [n for n in notifs if not n.get("read")]
        assert unread, "expected at least one unread"
        nid = unread[0]["id"]
        r = sess.post(f"{API}/notifications/{nid}/read")
        assert r.status_code == 200
        # verify persisted
        again = sess.get(f"{API}/notifications").json()
        found = [n for n in again if n["id"] == nid]
        assert found and found[0]["read"] is True


# ---------------- Activities (CRM) ----------------
class TestActivities:
    def test_list_activities(self, sess):
        r = sess.get(f"{API}/activities?limit=10")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for a in data:
            assert "_id" not in a
            for k in ("id", "type", "message", "created_at"):
                assert k in a

    def test_activity_on_new_order(self, sess):
        gs = sess.get(f"{API}/galleries").json()
        token = gs[0]["access_token"]
        prods = sess.get(f"{API}/store/products?active=true").json()
        payload = {
            "customer_name": "TEST_CRM",
            "customer_email": "delivered@resend.dev",
            "origin_url": BASE_URL,
            "items": [{
                "product_id": prods[0]["id"], "name": prods[0]["name"], "price": prods[0]["price"],
                "quantity": 1, "photo_name": "p.jpg", "photo_url": "https://p/p.jpg",
            }],
        }
        before = len(sess.get(f"{API}/activities?limit=200").json())
        r = sess.post(f"{API}/public/galleries/{token}/store-order", json=payload)
        assert r.status_code == 200
        number = r.json()["order"]["number"]
        acts = sess.get(f"{API}/activities?limit=200").json()
        assert len(acts) >= before + 1
        found = [a for a in acts if number in a.get("message", "") and "criado" in a.get("message", "").lower()]
        assert found, f"expected CRM activity for {number}"


# ---------------- Dashboard stats ----------------
class TestDashboardStats:
    def test_stats_contract(self, sess):
        r = sess.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_sales", "paid_orders", "avg_ticket", "notifications_unread",
                 "store_revenue_month", "revenue_month"):
            assert k in d, f"missing {k}"
        # types/values
        assert isinstance(d["paid_orders"], int)
        assert isinstance(d["notifications_unread"], int)
        assert d["total_sales"] >= 0
        assert d["avg_ticket"] >= 0


# ---------------- Order creation triggers full pre-payment side-effects ----------------
class TestOrderCreationSideEffects:
    def test_full_pre_paid_side_effects(self, sess):
        gs = sess.get(f"{API}/galleries").json()
        token = gs[0]["access_token"]
        prods = sess.get(f"{API}/store/products?active=true").json()
        payload = {
            "customer_name": "TEST_PreSideEffects",
            "customer_email": "delivered@resend.dev",
            "origin_url": BASE_URL,
            "items": [{
                "product_id": prods[0]["id"], "name": prods[0]["name"], "price": prods[0]["price"],
                "quantity": 1, "photo_name": "p.jpg", "photo_url": "https://p/p.jpg",
            }],
        }
        r = sess.post(f"{API}/public/galleries/{token}/store-order", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()["order"]
        number = order["number"]
        oid = order["id"]
        # payment_status pending / status novo
        assert order["payment_status"] == "pending"
        assert order["status"] == "novo"
        # history has 'Pedido criado' + 'Checkout iniciado.'
        hist_msgs = [h["message"] for h in order.get("history", [])]
        assert "Pedido criado." in hist_msgs
        assert "Checkout iniciado." in hist_msgs
        # session id present
        assert order.get("stripe_session_id", "").startswith("cs_test_")
        # new_order notification created
        notifs = sess.get(f"{API}/notifications").json()
        matched_n = [n for n in notifs if n.get("order_id") == oid and n.get("type") == "new_order"]
        assert matched_n, "new_order notification missing"
        # CRM activity created
        acts = sess.get(f"{API}/activities?limit=200").json()
        matched_a = [a for a in acts if a.get("order_id") == oid and a.get("type") == "order"]
        assert matched_a, "order activity missing"


# ---------------- Update order status triggers notifications ----------------
class TestUpdateOrderStatusNotifications:
    def _create_order(self, sess):
        gs = sess.get(f"{API}/galleries").json()
        token = gs[0]["access_token"]
        prods = sess.get(f"{API}/store/products?active=true").json()
        payload = {
            "customer_name": "TEST_StatusNotif",
            "customer_email": "delivered@resend.dev",
            "origin_url": BASE_URL,
            "items": [{
                "product_id": prods[0]["id"], "name": prods[0]["name"], "price": prods[0]["price"],
                "quantity": 1, "photo_name": "p.jpg", "photo_url": "https://p/p.jpg",
            }],
        }
        r = sess.post(f"{API}/public/galleries/{token}/store-order", json=payload)
        return r.json()["order"]

    def test_cancel_status_creates_notification(self, sess):
        o = self._create_order(sess)
        r = sess.patch(f"{API}/store/orders/{o['id']}/status", json={"status": "cancelado"})
        assert r.status_code == 200
        notifs = sess.get(f"{API}/notifications").json()
        matched = [n for n in notifs if n.get("order_id") == o["id"] and n.get("type") == "order_cancelled"]
        assert matched, "order_cancelled notification missing"

    def test_delivered_status_creates_notification(self, sess):
        o = self._create_order(sess)
        r = sess.patch(f"{API}/store/orders/{o['id']}/status", json={"status": "entregue"})
        assert r.status_code == 200
        notifs = sess.get(f"{API}/notifications").json()
        matched = [n for n in notifs if n.get("order_id") == o["id"] and n.get("type") == "order_completed"]
        assert matched, "order_completed notification missing"


# ---------------- Idempotency check on run_paid_automation via existing paid order ----------------
class TestPaidAutomationExistingOrder:
    """If a paid order already exists (from iteration_20), verify all post-paid artifacts present."""
    def test_existing_paid_order_artifacts(self, sess):
        orders = sess.get(f"{API}/store/orders").json()
        paid = [o for o in orders if o.get("payment_status") == "paid"]
        if not paid:
            pytest.skip("No paid order yet; will be validated in E2E frontend test")
        o = paid[0]
        number = o["number"]
        oid = o["id"]
        hist_msgs = [h.get("message", "") for h in o.get("history", [])]
        # required chronological entries
        for req in [
            "Pedido criado.",
            "Checkout iniciado.",
            "Pagamento confirmado pelo Stripe.",
            "Receita criada automaticamente.",
            "Email enviado ao fotógrafo.",
            "Notificação criada.",
            "CRM atualizado.",
        ]:
            assert req in hist_msgs, f"missing history entry: {req} in {hist_msgs}"
        # customer email entry (only if email present)
        if o.get("customer_email"):
            assert any(m.startswith("Email enviado ao cliente") or m.startswith("Falha ao enviar email ao cliente") for m in hist_msgs)
        # status still 'novo' (operational unchanged)
        assert o["status"] == "novo", f"operational status should remain 'novo', got {o['status']}"
        # receita created
        recs = sess.get(f"{API}/receivables").json()
        rec_match = [r for r in recs if r.get("order_id") == oid or r.get("order_number") == number]
        assert rec_match, f"no receivable found for order {number}"
        r = rec_match[0]
        assert r.get("method") == "Stripe"
        assert r.get("origin") == "Pedido Online"
        assert r.get("order_number") == number
        # received == total => status 'pago'
        assert abs(float(r.get("received", 0)) - float(r.get("total", 0))) < 0.01
        # payment_received notification
        notifs = sess.get(f"{API}/notifications").json()
        pr = [n for n in notifs if n.get("order_id") == oid and n.get("type") == "payment_received"]
        assert pr, "payment_received notification missing"
        assert pr[0]["title"] == "Pagamento recebido"
        # CRM 'pago.' activity
        acts = sess.get(f"{API}/activities?limit=500").json()
        pa = [a for a in acts if a.get("order_id") == oid and "pago" in a.get("message", "").lower()]
        assert pa, "'pedido pago' CRM activity missing"


# ---------------- Webhook signature check (invariants) ----------------
class TestWebhookSecurity:
    def test_webhook_rejects_invalid_signature(self, sess):
        r = sess.post(f"{API}/stripe/webhook", data=b'{"foo":"bar"}',
                      headers={"stripe-signature": "invalid", "Content-Type": "application/json"})
        assert r.status_code == 400
