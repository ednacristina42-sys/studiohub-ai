"""StudioHub AI — Iteration 4 backend tests: Galerias Premium + Área do Cliente.

Covers:
 - PATCH /api/galleries/{id}/settings (password, watermark, link_expires, categories)
 - POST /api/galleries/{id}/share -> returns access_token
 - PATCH /api/galleries/{id}/photos/{pid}/feature (toggle featured)
 - POST /api/galleries/{id}/ai-search  (real gpt-5.4)
 - POST /api/sessions/{id}/gallery (create or return existing)
 - GET /api/store/products -> 6 products
 - PUBLIC gallery:
     GET /api/public/galleries/{token}      (or protected:true when password set)
     POST /api/public/galleries/{token}/verify {password}
     PATCH /api/public/galleries/{token}/photos/{pid} {action, pin}
     POST /api/public/galleries/{token}/photos/{pid}/comment
     POST /api/public/galleries/{token}/order  (MOCK)
     Expired link_expires -> 410
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def photo_gallery(api_client):
    """Create a gallery with 2 photos to use across tests."""
    g = api_client.post(f"{BASE_URL}/api/galleries", json={
        "title": "TEST_Iter4 Gallery", "client_name": "TEST_ClienteIter4"
    }, timeout=15).json()
    # Add 2 photos (use pexels stock URLs - the seed uses these too)
    url1 = "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600"
    url2 = "https://images.pexels.com/photos/23876288/pexels-photo-23876288.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600"
    g = api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/photos", json={"url": url1, "name": "casal.jpg"}, timeout=15).json()
    g = api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/photos", json={"url": url2, "name": "detalhes.jpg"}, timeout=15).json()
    yield g
    # Teardown
    api_client.delete(f"{BASE_URL}/api/galleries/{g['id']}", timeout=15)


# ---------------- Gallery settings + share + feature ----------------
class TestGalleryPremiumSettings:
    def test_patch_settings_all_fields(self, api_client, photo_gallery):
        gid = photo_gallery["id"]
        r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/settings", json={
            "password": "segredo123",
            "watermark": True,
            "link_expires": "2030-12-31",
            "categories": ["cerimonia", "detalhes"],
        }, timeout=15)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["password"] == "segredo123"
        assert d["watermark"] is True
        assert d["link_expires"] == "2030-12-31"
        assert d["categories"] == ["cerimonia", "detalhes"]

    def test_patch_settings_partial_no_wipe(self, api_client, photo_gallery):
        gid = photo_gallery["id"]
        # Only update watermark; password/expires should remain
        r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/settings", json={"watermark": False}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["watermark"] is False
        assert d["password"] == "segredo123", "partial PATCH must not clear other fields"

    def test_settings_404(self, api_client):
        r = api_client.patch(f"{BASE_URL}/api/galleries/nonexistent-xyz/settings", json={"watermark": True}, timeout=15)
        assert r.status_code == 404

    def test_share_generates_token(self, api_client, photo_gallery):
        gid = photo_gallery["id"]
        r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/share", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("access_token"), "share must return access_token"
        assert d["status"] == "partilhada"
        photo_gallery["access_token"] = d["access_token"]
        # Idempotent: second call returns same token
        r2 = api_client.post(f"{BASE_URL}/api/galleries/{gid}/share", timeout=15)
        assert r2.json()["access_token"] == d["access_token"], "share must be idempotent"

    def test_feature_toggle(self, api_client, photo_gallery):
        gid = photo_gallery["id"]
        # refresh gallery
        g = api_client.get(f"{BASE_URL}/api/galleries/{gid}", timeout=15).json()
        pid = g["photos"][0]["id"]
        initial = g["photos"][0].get("featured", False)
        r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/feature", timeout=15)
        assert r.status_code == 200
        p_updated = next(p for p in r.json()["photos"] if p["id"] == pid)
        assert p_updated["featured"] is not initial
        # Toggle back
        r2 = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/feature", timeout=15)
        p2 = next(p for p in r2.json()["photos"] if p["id"] == pid)
        assert p2["featured"] is initial


# ---------------- AI search (real gpt-5.4) ----------------
class TestGalleryAiSearch:
    def test_ai_search_returns_list(self, api_client, photo_gallery):
        gid = photo_gallery["id"]
        # Empty query -> 400
        r_bad = api_client.post(f"{BASE_URL}/api/galleries/{gid}/ai-search", json={"query": ""}, timeout=15)
        assert r_bad.status_code == 400
        # Real gpt-5.4 call — may auto-analyze photos first; allow long timeout
        r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/ai-search", json={"query": "fotografias de casamento"}, timeout=180)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert "ids" in d and isinstance(d["ids"], list), f"ai-search must return {{ids:[...]}}: {d}"
        assert d.get("query") == "fotografias de casamento"


# ---------------- Session -> Gallery ----------------
class TestSessionGallery:
    def test_create_gallery_from_session_and_idempotent(self, api_client):
        # Create a session
        s = api_client.post(f"{BASE_URL}/api/sessions", json={
            "title": "TEST_Iter4 Sessao Galeria", "type": "retrato",
            "client_name": "TEST_ClienteSG", "date": "2026-10-15", "value": 250
        }, timeout=15).json()
        try:
            r1 = api_client.post(f"{BASE_URL}/api/sessions/{s['id']}/gallery", timeout=15)
            assert r1.status_code == 200, r1.text[:200]
            g1 = r1.json()
            assert g1["session_id"] == s["id"]
            assert "TEST_Iter4 Sessao Galeria" in g1["title"]
            assert g1["client_name"] == "TEST_ClienteSG"
            # Idempotent: second call returns SAME gallery
            r2 = api_client.post(f"{BASE_URL}/api/sessions/{s['id']}/gallery", timeout=15)
            assert r2.status_code == 200
            assert r2.json()["id"] == g1["id"], "creating gallery for same session must return existing"
            # cleanup
            api_client.delete(f"{BASE_URL}/api/galleries/{g1['id']}", timeout=15)
        finally:
            api_client.delete(f"{BASE_URL}/api/sessions/{s['id']}", timeout=15)

    def test_session_gallery_404(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/sessions/nonexistent-xyz/gallery", timeout=15)
        assert r.status_code == 404


# ---------------- Store products ----------------
class TestStoreProducts:
    def test_products_returns_six(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/store/products", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 6, f"expected 6 products, got {len(data)}"
        for p in data:
            for k in ("id", "name", "price", "type"):
                assert k in p, f"product missing key {k}: {p}"
            assert isinstance(p["price"], (int, float))


# ---------------- Public client gallery ----------------
@pytest.fixture(scope="module")
def public_gallery_no_password(api_client):
    """A shared gallery without password for public endpoint tests."""
    g = api_client.post(f"{BASE_URL}/api/galleries", json={
        "title": "TEST_Iter4 Public Open", "client_name": "TEST_Public"
    }, timeout=15).json()
    api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/photos", json={
        "url": "https://images.pexels.com/photos/5804239/pexels-photo-5804239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600",
        "name": "public1.jpg"
    }, timeout=15)
    share = api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/share", timeout=15).json()
    yield share
    api_client.delete(f"{BASE_URL}/api/galleries/{g['id']}", timeout=15)


@pytest.fixture(scope="module")
def public_gallery_password(api_client):
    """A shared gallery WITH password."""
    g = api_client.post(f"{BASE_URL}/api/galleries", json={
        "title": "TEST_Iter4 Public Prot", "client_name": "TEST_PublicProt"
    }, timeout=15).json()
    api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/photos", json={
        "url": "https://images.pexels.com/photos/8015871/pexels-photo-8015871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=600",
        "name": "prot1.jpg"
    }, timeout=15)
    api_client.patch(f"{BASE_URL}/api/galleries/{g['id']}/settings", json={"password": "abc123"}, timeout=15)
    share = api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/share", timeout=15).json()
    yield share
    api_client.delete(f"{BASE_URL}/api/galleries/{g['id']}", timeout=15)


class TestPublicGalleryOpen:
    def test_get_returns_full_gallery(self, api_client, public_gallery_no_password):
        token = public_gallery_no_password["access_token"]
        r = api_client.get(f"{BASE_URL}/api/public/galleries/{token}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("protected") is not True
        assert "photos" in d and len(d["photos"]) >= 1
        assert d["title"] == "TEST_Iter4 Public Open"

    def test_bad_token_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/public/galleries/nonexistent-token-xyz", timeout=15)
        assert r.status_code == 404

    def test_photo_action_favorite(self, api_client, public_gallery_no_password):
        token = public_gallery_no_password["access_token"]
        g = api_client.get(f"{BASE_URL}/api/public/galleries/{token}", timeout=15).json()
        pid = g["photos"][0]["id"]
        r = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                             json={"action": "favorite"}, timeout=15)
        assert r.status_code == 200
        photo = next(p for p in r.json()["photos"] if p["id"] == pid)
        assert photo["client_favorite"] is True
        # Toggle off
        r2 = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                              json={"action": "favorite"}, timeout=15)
        photo2 = next(p for p in r2.json()["photos"] if p["id"] == pid)
        assert photo2["client_favorite"] is False

    def test_photo_action_select_and_approve_reject(self, api_client, public_gallery_no_password):
        token = public_gallery_no_password["access_token"]
        g = api_client.get(f"{BASE_URL}/api/public/galleries/{token}", timeout=15).json()
        pid = g["photos"][0]["id"]

        r = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                             json={"action": "select"}, timeout=15)
        assert r.status_code == 200
        p = next(x for x in r.json()["photos"] if x["id"] == pid)
        assert p["client_selected"] is True

        r = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                             json={"action": "approve"}, timeout=15)
        p = next(x for x in r.json()["photos"] if x["id"] == pid)
        assert p["approval"] == "aprovada"

        r = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                             json={"action": "reject"}, timeout=15)
        p = next(x for x in r.json()["photos"] if x["id"] == pid)
        assert p["approval"] == "rejeitada"

    def test_add_comment(self, api_client, public_gallery_no_password):
        token = public_gallery_no_password["access_token"]
        g = api_client.get(f"{BASE_URL}/api/public/galleries/{token}", timeout=15).json()
        pid = g["photos"][0]["id"]

        r_empty = api_client.post(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}/comment",
                                  json={"text": "", "author": "Cliente"}, timeout=15)
        assert r_empty.status_code == 400

        r = api_client.post(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}/comment",
                            json={"text": "Adoro esta!", "author": "Ana Teste"}, timeout=15)
        assert r.status_code == 200
        p = next(x for x in r.json()["photos"] if x["id"] == pid)
        assert len(p["comments"]) >= 1
        last = p["comments"][-1]
        assert last["text"] == "Adoro esta!"
        assert last["author"] == "Ana Teste"
        assert "ts" in last

    def test_order_mock_checkout(self, api_client, public_gallery_no_password):
        token = public_gallery_no_password["access_token"]
        r = api_client.post(f"{BASE_URL}/api/public/galleries/{token}/order", json={
            "items": [{"id": "digital", "name": "Foto digital", "price": 12},
                      {"id": "print-a4", "name": "Impressão A4", "price": 18}],
            "total": 30
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["mock"] is True
        assert d["order"]["total"] == 30
        assert d["order"]["status"] == "recebida"


class TestPublicGalleryPassword:
    def test_get_returns_protected_marker(self, api_client, public_gallery_password):
        token = public_gallery_password["access_token"]
        r = api_client.get(f"{BASE_URL}/api/public/galleries/{token}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("protected") is True
        assert "photos" not in d, "photos must not leak when password-protected"
        assert d["title"] == "TEST_Iter4 Public Prot"

    def test_verify_wrong_password_403(self, api_client, public_gallery_password):
        token = public_gallery_password["access_token"]
        r = api_client.post(f"{BASE_URL}/api/public/galleries/{token}/verify",
                            json={"password": "wrong"}, timeout=15)
        assert r.status_code == 403

    def test_verify_correct_password_returns_full(self, api_client, public_gallery_password):
        token = public_gallery_password["access_token"]
        r = api_client.post(f"{BASE_URL}/api/public/galleries/{token}/verify",
                            json={"password": "abc123"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("protected") is not True
        assert "photos" in d and len(d["photos"]) >= 1

    def test_photo_action_requires_pin(self, api_client, public_gallery_password):
        """Password-protected: photo action without correct pin -> 403."""
        token = public_gallery_password["access_token"]
        # Get pid via verify (correct password)
        v = api_client.post(f"{BASE_URL}/api/public/galleries/{token}/verify",
                            json={"password": "abc123"}, timeout=15).json()
        pid = v["photos"][0]["id"]
        r_bad = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                                 json={"action": "favorite", "pin": "wrong"}, timeout=15)
        assert r_bad.status_code == 403
        r_ok = api_client.patch(f"{BASE_URL}/api/public/galleries/{token}/photos/{pid}",
                                json={"action": "favorite", "pin": "abc123"}, timeout=15)
        assert r_ok.status_code == 200


class TestPublicGalleryExpired:
    def test_expired_link_returns_410(self, api_client):
        # Create gallery, set link_expires in the past, share, then GET public
        g = api_client.post(f"{BASE_URL}/api/galleries", json={
            "title": "TEST_Iter4 Expired", "client_name": "TEST_Exp"
        }, timeout=15).json()
        try:
            api_client.patch(f"{BASE_URL}/api/galleries/{g['id']}/settings",
                             json={"link_expires": "2020-01-01"}, timeout=15)
            share = api_client.post(f"{BASE_URL}/api/galleries/{g['id']}/share", timeout=15).json()
            token = share["access_token"]
            r = api_client.get(f"{BASE_URL}/api/public/galleries/{token}", timeout=15)
            assert r.status_code == 410, f"expected 410 for expired, got {r.status_code}: {r.text[:200]}"
        finally:
            api_client.delete(f"{BASE_URL}/api/galleries/{g['id']}", timeout=15)
