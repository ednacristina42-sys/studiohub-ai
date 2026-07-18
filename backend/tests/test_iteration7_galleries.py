"""Iteration 7 — Galleries premium (photographer photo actions + new create fields).

Covers:
- POST /api/galleries with new fields (type, date, description, session_id, password, cover)
- PATCH /api/galleries/{gid}/photos/{pid}/rate     stars 0..5, clamped
- PATCH /api/galleries/{gid}/photos/{pid}/toggle   field=favorite|selected + 400 for invalid
- POST  /api/galleries/{gid}/photos/{pid}/comment  400 for empty text
- Regression: feature toggle, share (access_token), settings, ai-select, ai-search
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

STOCK_IMG = (
    "https://images.pexels.com/photos/7778884/pexels-photo-7778884.jpeg"
    "?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
)


# ---------- Helpers ----------

def _create_gallery(api_client, **overrides):
    payload = {
        "title": "TEST_iter7 gallery",
        "client_name": "TEST_client",
        "type": "casamento",
        "date": "2026-02-14",
        "description": "TEST description",
        "cover": STOCK_IMG,
        "password": "s3cret",
    }
    payload.update(overrides)
    r = api_client.post(f"{BASE_URL}/api/galleries", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def _add_photo(api_client, gid, url=STOCK_IMG, name="p.jpg"):
    r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/photos", json={"url": url, "name": name})
    assert r.status_code == 200, r.text
    return r.json()


def _cleanup(api_client, gid):
    api_client.delete(f"{BASE_URL}/api/galleries/{gid}")


# ---------- Create with new fields ----------

class TestGalleryCreateNewFields:
    def test_create_persists_all_new_fields(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 create-1")
        gid = g["id"]
        try:
            assert g["title"] == "TEST_iter7 create-1"
            assert g["type"] == "casamento"
            assert g["date"] == "2026-02-14"
            assert g["description"] == "TEST description"
            assert g["cover"] == STOCK_IMG
            assert g["password"] == "s3cret"
            # GET verifies persistence
            r = api_client.get(f"{BASE_URL}/api/galleries/{gid}")
            assert r.status_code == 200
            d = r.json()
            for k, v in [("type", "casamento"), ("date", "2026-02-14"),
                         ("description", "TEST description"), ("cover", STOCK_IMG),
                         ("password", "s3cret")]:
                assert d[k] == v, f"{k} not persisted"
        finally:
            _cleanup(api_client, gid)

    def test_create_with_session_id(self, api_client):
        # Fetch a session
        s = api_client.get(f"{BASE_URL}/api/sessions").json()
        assert s, "no sessions seeded"
        sess_id = s[0]["id"]
        g = _create_gallery(api_client, title="TEST_iter7 create-sess", session_id=sess_id)
        gid = g["id"]
        try:
            assert g["session_id"] == sess_id
        finally:
            _cleanup(api_client, gid)

    def test_create_defaults(self, api_client):
        # Minimal payload — defaults must kick in
        r = api_client.post(f"{BASE_URL}/api/galleries", json={"title": "TEST_iter7 minimal"})
        assert r.status_code == 200
        g = r.json()
        try:
            assert g["type"] == "sessao"
            assert g["status"] == "pendente"
            assert g["password"] == ""
            assert g["description"] == ""
            assert g["photos"] == []
        finally:
            _cleanup(api_client, g["id"])


# ---------- Rate photo ----------

class TestPhotoRate:
    def test_rate_sets_stars(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 rate")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            for n in (3, 5, 0):
                r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/rate", json={"stars": n})
                assert r.status_code == 200
                photos = r.json()["photos"]
                p = next(x for x in photos if x["id"] == pid)
                assert p["stars"] == n
        finally:
            _cleanup(api_client, gid)

    def test_rate_clamps_high_and_low(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 rate-clamp")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/rate", json={"stars": 99})
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert p["stars"] == 5, "should clamp above to 5"
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/rate", json={"stars": -3})
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert p["stars"] == 0, "should clamp below to 0"
        finally:
            _cleanup(api_client, gid)


# ---------- Toggle photo (favorite/selected) ----------

class TestPhotoToggle:
    def test_toggle_favorite(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 fav")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/toggle", json={"field": "favorite"})
            assert r.status_code == 200
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert p["favorite"] is True
            # second toggle -> False
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/toggle", json={"field": "favorite"})
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert p["favorite"] is False
        finally:
            _cleanup(api_client, gid)

    def test_toggle_selected(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 sel")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/toggle", json={"field": "selected"})
            assert r.status_code == 200
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert p["selected"] is True
        finally:
            _cleanup(api_client, gid)

    def test_toggle_invalid_field_400(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 badfield")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/toggle", json={"field": "hacker"})
            assert r.status_code == 400
        finally:
            _cleanup(api_client, gid)


# ---------- Comment photo ----------

class TestPhotoComment:
    def test_comment_appends(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 comment")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/comment",
                                json={"text": "Bela luz", "author": "Fotógrafo"})
            assert r.status_code == 200
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert len(p["comments"]) == 1
            assert p["comments"][0]["text"] == "Bela luz"
            assert p["comments"][0]["author"] == "Fotógrafo"
            # 2nd comment appends
            api_client.post(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/comment",
                            json={"text": "muito boa", "author": "Fotógrafo"})
            r = api_client.get(f"{BASE_URL}/api/galleries/{gid}")
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert len(p["comments"]) == 2
        finally:
            _cleanup(api_client, gid)

    def test_comment_empty_400(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 empty-cmt")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/comment",
                                json={"text": "   "})
            assert r.status_code == 400
            r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/comment",
                                json={"text": ""})
            assert r.status_code == 400
        finally:
            _cleanup(api_client, gid)


# ---------- Regression: feature / share / settings ----------

class TestGalleryRegression:
    def test_feature_toggle(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 feature")
        gid = g["id"]
        try:
            g2 = _add_photo(api_client, gid)
            pid = g2["photos"][0]["id"]
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/photos/{pid}/feature")
            assert r.status_code == 200
            p = next(x for x in r.json()["photos"] if x["id"] == pid)
            assert p["featured"] is True
        finally:
            _cleanup(api_client, gid)

    def test_share_generates_access_token(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 share")
        gid = g["id"]
        try:
            r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/share")
            assert r.status_code == 200
            d = r.json()
            assert d.get("access_token") and len(d["access_token"]) >= 8
            assert d["status"] == "partilhada"
        finally:
            _cleanup(api_client, gid)

    def test_settings_patch(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 settings", password="")
        gid = g["id"]
        try:
            r = api_client.patch(f"{BASE_URL}/api/galleries/{gid}/settings",
                                 json={"password": "abc123", "watermark": True, "link_expires": "2030-01-01"})
            assert r.status_code == 200
            d = r.json()
            assert d["password"] == "abc123"
            assert d["watermark"] is True
            assert d["link_expires"] == "2030-01-01"
        finally:
            _cleanup(api_client, gid)


# ---------- Regression from previous iterations: list still works ----------

def test_list_galleries_still_works(api_client):
    r = api_client.get(f"{BASE_URL}/api/galleries")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- AI regression is expensive; run only when explicitly requested ----------

@pytest.mark.skipif(os.environ.get("RUN_AI_TESTS") != "1", reason="AI (gpt-5.4) is slow; enable with RUN_AI_TESTS=1")
class TestAIRegression:
    def test_ai_search_empty_query_400(self, api_client):
        g = _create_gallery(api_client, title="TEST_iter7 ai-search-empty")
        gid = g["id"]
        try:
            r = api_client.post(f"{BASE_URL}/api/galleries/{gid}/ai-search", json={"query": ""})
            assert r.status_code == 400
        finally:
            _cleanup(api_client, gid)


# api_client fixture comes from conftest.py (session-scoped)
