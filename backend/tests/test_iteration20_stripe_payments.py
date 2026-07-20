"""
Iteration 20 — Stripe Payments integration (TEST MODE)
Covers:
  - POST /api/public/galleries/{token}/store-order (server-side price recompute,
    returns checkout_url + session_id and payment_status='pending')
  - GET /api/public/checkout/status/{session_id} (returns DB payment_status +
    live stripe_status without flipping to paid on its own)
  - POST /api/stripe/webhook (returns 400 on invalid signature)
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


# ---------- helpers ----------
@pytest.fixture(scope="module")
def gallery_token(api_client):
    """Pick any gallery access_token from the app."""
    r = api_client.get(f"{API}/galleries", timeout=30)
    assert r.status_code == 200, f"/galleries failed: {r.status_code} {r.text[:200]}"
    galleries = r.json()
    assert isinstance(galleries, list) and len(galleries) > 0, "no galleries"
    token = None
    for g in galleries:
        if g.get("access_token"):
            token = g["access_token"]
            break
    assert token, "no access_token found"
    return token


@pytest.fixture(scope="module")
def product(api_client):
    r = api_client.get(f"{API}/store/products?active=true", timeout=30)
    assert r.status_code == 200, f"/store/products failed: {r.status_code}"
    prods = r.json()
    assert isinstance(prods, list) and len(prods) > 0, "no products"
    # Pick first product with price > 0
    for p in prods:
        if float(p.get("price", 0)) > 0:
            return p
    pytest.skip("no priced product available")


# ---------- Store-order tests ----------
class TestStoreOrder:
    def test_create_checkout_session_and_recompute_price(self, api_client, gallery_token, product):
        real_price = float(product["price"])
        # Send a MANIPULATED low price + wrong name. Server must ignore both.
        payload = {
            "items": [{
                "product_id": product["id"],
                "name": "HACKED NAME",
                "price": 0.01,          # tentativa de manipulação
                "quantity": 2,
                "photo_name": "test.jpg",
                "photo_url": "https://example.com/x.jpg",
                "notes": "TEST_iter20"
            }],
            "customer_name": "TEST_Iter20 Buyer",
            "customer_email": "test-iter20@example.com",
            "customer_phone": "",
            "notes": "TEST_iter20",
            "origin_url": BASE_URL,
        }
        r = api_client.post(f"{API}/public/galleries/{gallery_token}/store-order", json=payload, timeout=30)
        assert r.status_code == 200, f"store-order failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        # Response shape
        assert data.get("ok") is True
        assert "checkout_url" in data and data["checkout_url"].startswith("https://checkout.stripe.com/"), \
            f"unexpected checkout_url: {data.get('checkout_url')}"
        assert "session_id" in data and data["session_id"].startswith("cs_"), \
            f"unexpected session_id: {data.get('session_id')}"
        order = data["order"]
        # Server-side recompute
        expected_total = round(real_price * 2, 2)
        assert abs(float(order["total"]) - expected_total) < 0.01, \
            f"total not recomputed: expected {expected_total} got {order['total']}"
        assert order["items"][0]["price"] == real_price, \
            f"item price manipulated: expected {real_price} got {order['items'][0]['price']}"
        assert order["items"][0]["name"] == product["name"], \
            f"item name manipulated: expected {product['name']} got {order['items'][0]['name']}"
        # Payment fields
        assert order["payment_status"] == "pending"
        assert order["status"] == "novo"
        assert order["currency"] == "eur"
        assert order["stripe_session_id"] == data["session_id"]
        # Number format
        assert order["number"].startswith("ENC-")
        # Save for next test via pytest cache
        pytest.iter20_session_id = data["session_id"]
        pytest.iter20_order_id = order["id"]
        pytest.iter20_order_number = order["number"]
        pytest.iter20_order_total = order["total"]

    def test_empty_cart_rejected(self, api_client, gallery_token):
        r = api_client.post(f"{API}/public/galleries/{gallery_token}/store-order",
                            json={"items": [], "customer_name": "TEST_x", "origin_url": BASE_URL}, timeout=30)
        assert r.status_code == 400


# ---------- Checkout status ----------
class TestCheckoutStatus:
    def test_status_reflects_pending_and_does_not_flip(self, api_client):
        session_id = getattr(pytest, "iter20_session_id", None)
        if not session_id:
            pytest.skip("no session created")
        r = api_client.get(f"{API}/public/checkout/status/{session_id}", timeout=30)
        assert r.status_code == 200, f"status failed: {r.status_code} {r.text[:200]}"
        data = r.json()
        # DB payment_status must remain 'pending' (only webhook can flip it)
        assert data["payment_status"] == "pending", \
            f"payment_status flipped without webhook: {data['payment_status']}"
        # Operational status remains 'novo'
        assert data["status"] == "novo"
        # Live stripe_status should be 'unpaid' (checkout not completed yet)
        assert data.get("stripe_status") in ("unpaid", "no_payment_required"), \
            f"unexpected live stripe_status: {data.get('stripe_status')}"
        # Order number matches
        assert data["order_number"] == pytest.iter20_order_number
        # Second call still pending
        r2 = api_client.get(f"{API}/public/checkout/status/{session_id}", timeout=30)
        assert r2.json()["payment_status"] == "pending"

    def test_status_404_for_unknown(self, api_client):
        r = api_client.get(f"{API}/public/checkout/status/cs_test_unknown_xyz", timeout=30)
        assert r.status_code == 404


# ---------- Webhook ----------
class TestStripeWebhook:
    def test_webhook_invalid_signature_returns_400(self, api_client):
        r = api_client.post(
            f"{API}/stripe/webhook",
            data=b'{"id":"evt_test","type":"checkout.session.completed","data":{"object":{"id":"cs_test"}}}',
            headers={"Content-Type": "application/json", "stripe-signature": "t=1,v1=invalid"},
            timeout=30,
        )
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"

    def test_webhook_missing_signature_returns_400(self, api_client):
        r = api_client.post(
            f"{API}/stripe/webhook",
            data=b'{}',
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        assert r.status_code == 400
