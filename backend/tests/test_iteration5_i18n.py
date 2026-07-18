"""Iteration 5 — Backend tests for i18n Settings + expanded Client fields.

Covers:
  - GET /api/settings returns PT defaults (creates on first call if missing)
  - PUT /api/settings persists BR preset (currency, tax_name, address_labels)
  - Round-trip: PUT PT → GET → verify persisted; PUT BR → GET → verify persisted
  - Client POST accepts tax_id, postal_code, region, city, district (+ legacy nif)
  - Client GET returns them; PUT updates them
  - Cleanup: RESET settings back to PT default at the end.
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

PT_SETTINGS = {
    "company_name": "StudioHub AI",
    "country": "PT",
    "language": "pt",
    "currency": "EUR",
    "locale": "pt-PT",
    "timezone": "Europe/Lisbon",
    "date_format": "dd/MM/yyyy",
    "tax_rate": 23,
    "tax_name": "NIF",
    "tax_label": "IVA",
    "address_labels": {"postal_code": "Código Postal", "region": "Distrito",
                       "city": "Concelho", "district": "Freguesia"},
}

BR_SETTINGS = {
    "company_name": "StudioHub AI",
    "country": "BR",
    "language": "pt",
    "currency": "BRL",
    "locale": "pt-BR",
    "timezone": "America/Sao_Paulo",
    "date_format": "dd/MM/yyyy",
    "tax_rate": 0,
    "tax_name": "CPF/CNPJ",
    "tax_label": "Imposto",
    "address_labels": {"postal_code": "CEP", "region": "Estado",
                       "city": "Cidade", "district": "Bairro"},
}


# ---------- Settings ----------
class TestSettings:
    def test_get_settings_returns_defaults(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Must have all core i18n keys
        for k in ["company_name", "country", "language", "currency", "locale",
                  "timezone", "date_format", "tax_rate", "tax_name", "tax_label",
                  "address_labels"]:
            assert k in d, f"missing key: {k}"
        assert isinstance(d["address_labels"], dict)
        for k in ["postal_code", "region", "city", "district"]:
            assert k in d["address_labels"]

    def test_put_settings_br_then_get_persisted(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/settings", json=BR_SETTINGS, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["country"] == "BR"
        assert d["currency"] == "BRL"
        assert d["tax_name"] == "CPF/CNPJ"
        assert d["address_labels"]["postal_code"] == "CEP"
        assert d["address_labels"]["region"] == "Estado"
        assert d["address_labels"]["city"] == "Cidade"
        assert d["address_labels"]["district"] == "Bairro"

        # GET must return persisted BR
        g = api_client.get(f"{BASE_URL}/api/settings", timeout=15)
        assert g.status_code == 200
        gd = g.json()
        assert gd["country"] == "BR"
        assert gd["currency"] == "BRL"
        assert gd["tax_name"] == "CPF/CNPJ"
        assert gd["locale"] == "pt-BR"
        assert gd["address_labels"]["postal_code"] == "CEP"

    def test_put_settings_back_to_pt(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/settings", json=PT_SETTINGS, timeout=15)
        assert r.status_code == 200
        assert r.json()["country"] == "PT"
        g = api_client.get(f"{BASE_URL}/api/settings", timeout=15)
        gd = g.json()
        assert gd["country"] == "PT"
        assert gd["currency"] == "EUR"
        assert gd["tax_name"] == "NIF"
        assert gd["tax_label"] == "IVA"
        assert gd["address_labels"]["region"] == "Distrito"


# ---------- Client expanded fields ----------
class TestClientI18n:
    cid = None

    def test_create_client_with_expanded_fields(self, api_client):
        payload = {
            "name": "TEST_i18n_Cliente",
            "email": "i18n@test.pt",
            "tax_id": "123456789",
            "postal_code": "1000-100",
            "region": "Lisboa",
            "city": "Lisboa",
            "district": "Alvalade",
            "nif": "999888777",
            "status": "ativo",
        }
        r = api_client.post(f"{BASE_URL}/api/clients", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["tax_id", "postal_code", "region", "city", "district", "nif"]:
            assert d.get(k) == payload[k], f"{k}={d.get(k)} expected {payload[k]}"
        TestClientI18n.cid = d["id"]

    def test_get_client_returns_expanded_fields(self, api_client):
        assert TestClientI18n.cid
        r = api_client.get(f"{BASE_URL}/api/clients/{TestClientI18n.cid}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["tax_id"] == "123456789"
        assert d["postal_code"] == "1000-100"
        assert d["region"] == "Lisboa"
        assert d["city"] == "Lisboa"
        assert d["district"] == "Alvalade"

    def test_put_client_updates_expanded_fields(self, api_client):
        assert TestClientI18n.cid
        upd = {
            "name": "TEST_i18n_Cliente",
            "tax_id": "22222222222",  # CPF/CNPJ-like
            "postal_code": "01310-100",
            "region": "SP",
            "city": "São Paulo",
            "district": "Bela Vista",
            "status": "ativo",
        }
        r = api_client.put(f"{BASE_URL}/api/clients/{TestClientI18n.cid}", json=upd, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["tax_id"] == "22222222222"
        assert d["postal_code"] == "01310-100"
        assert d["region"] == "SP"
        assert d["city"] == "São Paulo"
        assert d["district"] == "Bela Vista"

    def test_cleanup_delete_client(self, api_client):
        if TestClientI18n.cid:
            r = api_client.delete(f"{BASE_URL}/api/clients/{TestClientI18n.cid}", timeout=15)
            assert r.status_code == 200


# ---------- Final teardown: force settings back to PT (safety net) ----------
@pytest.fixture(scope="module", autouse=True)
def reset_settings_after_module(api_client):
    yield
    # After all tests in this module run, RESET to PT
    try:
        api_client.put(f"{BASE_URL}/api/settings", json=PT_SETTINGS, timeout=15)
    except Exception:
        pass
