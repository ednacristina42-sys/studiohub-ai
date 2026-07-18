"""StudioHub AI — Backend tests for Iteration 6 (Client Portal).

Covers:
 - Portal auth: login (200/401), me (with/without/invalid token), forgot-password
 - Portal data endpoints scoped by client_name (dashboard, sessions, galleries,
   contracts, quotes, invoices) — all require Bearer token
 - Profile update
 - Security: password_hash never leaked (portal + /api/clients)
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

ANA = {"email": "ana.rui@email.pt", "password": "cliente123"}
BEA = {"email": "beatriz.c@email.pt", "password": "cliente123"}


# ---------------- helpers ----------------
def _login(api_client, creds):
    return api_client.post(f"{BASE_URL}/api/portal/auth/login", json=creds, timeout=15)


@pytest.fixture(scope="module")
def ana_token(api_client):
    r = _login(api_client, ANA)
    assert r.status_code == 200, f"Ana login failed: {r.status_code} {r.text[:200]}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def bea_token(api_client):
    r = _login(api_client, BEA)
    assert r.status_code == 200, f"Beatriz login failed: {r.status_code} {r.text[:200]}"
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Auth ----------------
class TestPortalAuth:
    def test_login_success_returns_token_and_client(self, api_client):
        r = _login(api_client, ANA)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert "client" in d and isinstance(d["client"], dict)
        c = d["client"]
        assert c.get("email", "").lower() == ANA["email"]
        assert "password_hash" not in c, "password_hash must not be returned"
        assert "id" in c and "name" in c

    def test_login_wrong_password(self, api_client):
        r = _login(api_client, {"email": ANA["email"], "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_email(self, api_client):
        r = _login(api_client, {"email": "nobody@nowhere.pt", "password": "cliente123"})
        assert r.status_code == 401

    def test_me_without_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/portal/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_invalid_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/portal/auth/me",
                         headers={"Authorization": "Bearer not-a-real-token"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_valid_token(self, api_client, ana_token):
        r = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"].lower() == ANA["email"]
        assert "password_hash" not in d

    def test_forgot_password_generic_success(self, api_client):
        # existing email
        r1 = api_client.post(f"{BASE_URL}/api/portal/auth/forgot-password",
                             json={"email": ANA["email"]}, timeout=15)
        assert r1.status_code == 200
        assert r1.json().get("ok") is True
        # unknown email should also return success (no enumeration)
        r2 = api_client.post(f"{BASE_URL}/api/portal/auth/forgot-password",
                             json={"email": "unknown@nope.pt"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True


# ---------------- Portal data scoping ----------------
PORTAL_DATA_ENDPOINTS = [
    "/api/portal/dashboard",
    "/api/portal/sessions",
    "/api/portal/galleries",
    "/api/portal/contracts",
    "/api/portal/quotes",
    "/api/portal/invoices",
]


class TestPortalUnauthenticated:
    @pytest.mark.parametrize("ep", PORTAL_DATA_ENDPOINTS)
    def test_401_without_token(self, ep):
        r = requests.get(f"{BASE_URL}{ep}", timeout=15)
        assert r.status_code == 401, f"{ep} must be 401 without token, got {r.status_code}"

    @pytest.mark.parametrize("ep", PORTAL_DATA_ENDPOINTS)
    def test_401_invalid_token(self, ep):
        r = requests.get(f"{BASE_URL}{ep}",
                         headers={"Authorization": "Bearer nope"}, timeout=15)
        assert r.status_code == 401


class TestPortalDashboard:
    def test_dashboard_shape_and_scoping(self, ana_token):
        r = requests.get(f"{BASE_URL}/api/portal/dashboard", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["client", "next_session", "galleries", "documents",
                  "pending_payments", "paid_total", "counts"]:
            assert k in d, f"missing key {k}"
        # No password_hash on client
        assert "password_hash" not in d["client"]
        # Counts consistency
        assert isinstance(d["counts"], dict)
        for k in ["sessions", "galleries", "invoices"]:
            assert k in d["counts"]
        assert isinstance(d["pending_payments"], (int, float))
        assert isinstance(d["paid_total"], (int, float))


class TestPortalScoping:
    """Each client must only see their own records."""

    def test_sessions_scoped_to_client(self, ana_token):
        me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        name = me["name"]
        r = requests.get(f"{BASE_URL}/api/portal/sessions", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        for row in rows:
            assert row.get("client_name") == name, f"leak: session for {row.get('client_name')} in {name}'s list"

    def test_galleries_scoped(self, ana_token):
        me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        name = me["name"]
        r = requests.get(f"{BASE_URL}/api/portal/galleries", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        for row in r.json():
            assert row.get("client_name") == name

    def test_contracts_scoped(self, ana_token):
        me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        name = me["name"]
        r = requests.get(f"{BASE_URL}/api/portal/contracts", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        for row in r.json():
            assert row.get("client_name") == name

    def test_quotes_scoped(self, ana_token):
        me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        name = me["name"]
        r = requests.get(f"{BASE_URL}/api/portal/quotes", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        for row in r.json():
            assert row.get("client_name") == name

    def test_invoices_scoped(self, ana_token):
        me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        name = me["name"]
        r = requests.get(f"{BASE_URL}/api/portal/invoices", headers=_auth(ana_token), timeout=15)
        assert r.status_code == 200
        for row in r.json():
            assert row.get("client_name") == name

    def test_ana_and_beatriz_see_different_data(self, ana_token, bea_token):
        ana_me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        bea_me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(bea_token), timeout=15).json()
        assert ana_me["id"] != bea_me["id"]
        assert ana_me["name"] != bea_me["name"]
        # Sessions lists cross-check: no session with beatriz's name in ana's list and vice-versa
        ana_sess = requests.get(f"{BASE_URL}/api/portal/sessions", headers=_auth(ana_token), timeout=15).json()
        bea_sess = requests.get(f"{BASE_URL}/api/portal/sessions", headers=_auth(bea_token), timeout=15).json()
        for s in ana_sess:
            assert s.get("client_name") != bea_me["name"]
        for s in bea_sess:
            assert s.get("client_name") != ana_me["name"]


# ---------------- Profile update ----------------
class TestPortalProfile:
    def test_update_profile_and_persistence(self, ana_token):
        # get current
        me = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        original_phone = me.get("phone", "")
        new_phone = "+351 900 000 111"
        r = requests.put(f"{BASE_URL}/api/portal/profile",
                         headers=_auth(ana_token),
                         json={"phone": new_phone}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["phone"] == new_phone
        assert "password_hash" not in d
        # verify persistence via /me
        me2 = requests.get(f"{BASE_URL}/api/portal/auth/me", headers=_auth(ana_token), timeout=15).json()
        assert me2["phone"] == new_phone
        # restore
        requests.put(f"{BASE_URL}/api/portal/profile",
                     headers=_auth(ana_token),
                     json={"phone": original_phone}, timeout=15)

    def test_profile_requires_auth(self, api_client):
        r = requests.put(f"{BASE_URL}/api/portal/profile",
                         json={"phone": "x"}, timeout=15)
        assert r.status_code == 401


# ---------------- Security: password_hash never leaks ----------------
class TestPasswordHashLeak:
    def test_clients_list_no_password_hash(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        assert r.status_code == 200
        for c in r.json():
            assert "password_hash" not in c

    def test_client_detail_no_password_hash(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/clients", timeout=15)
        cid = r.json()[0]["id"]
        r2 = api_client.get(f"{BASE_URL}/api/clients/{cid}", timeout=15)
        assert r2.status_code == 200
        assert "password_hash" not in r2.json()
