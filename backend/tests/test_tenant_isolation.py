"""Fase 5.2 / 5.2.1 — Testes automáticos de isolamento multi-tenant + catálogo público.
Cria uma segunda organização (B) + utilizador, e prova que A não vê dados de B e vice-versa,
incluindo o catálogo público por token de galeria.
Execução: REACT_APP_BACKEND_URL=<url> python -m pytest backend/tests/test_tenant_isolation.py -v
"""
import os
import uuid
import bcrypt
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


def _api():
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                return line.strip().split("=", 1)[1] + "/api"
    raise RuntimeError("no backend url")


API = _api()
mc = MongoClient(MONGO_URL)
db = mc[DB_NAME]
NOW = datetime.now(timezone.utc).isoformat()
TAG = uuid.uuid4().hex[:6]

ORG_A_EMAIL = os.environ.get("ADMIN_EMAIL", "geral@studioefotografias.pt")
ORG_A_PW = os.environ.get("ADMIN_PASSWORD", "studio123")
ORG_B_EMAIL = f"ownerb_{TAG}@test.pt"
ORG_B_PW = "senhaB12345"


def _setup_org_b():
    org = {"id": str(uuid.uuid4()), "name": f"Estúdio Teste B {TAG}", "slug": f"est-b-{TAG}",
           "status": "active", "created_at": NOW}
    db.organizations.insert_one(dict(org))
    uid = str(uuid.uuid4())
    db.users.insert_one({"id": uid, "name": "Owner B", "email": ORG_B_EMAIL,
                         "password_hash": bcrypt.hashpw(ORG_B_PW.encode(), bcrypt.gensalt()).decode(),
                         "organization_id": org["id"], "role": "owner", "created_at": NOW})
    db.organization_members.insert_one({"id": str(uuid.uuid4()), "organization_id": org["id"],
                                        "user_id": uid, "role": "owner", "created_at": NOW})
    return org["id"]


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


ORG_B_ID = _setup_org_b()
HA = _login(ORG_A_EMAIL, ORG_A_PW)
HB = _login(ORG_B_EMAIL, ORG_B_PW)
NAME_A = f"CLIENTE_A_{TAG}"
NAME_B = f"CLIENTE_B_{TAG}"
TITLE_A = f"GAL_A_{TAG}"
TITLE_B = f"GAL_B_{TAG}"
PROD_A = f"PROD_A_{TAG}"
PROD_B = f"PROD_B_{TAG}"


def _post(path, headers, body):
    r = requests.post(f"{API}{path}", json=body, headers=headers)
    assert r.status_code in (200, 201), f"POST {path}: {r.status_code} {r.text}"
    return r.json()


def _get(path, headers):
    r = requests.get(f"{API}{path}", headers=headers)
    assert r.status_code == 200, f"GET {path}: {r.status_code} {r.text}"
    return r.json()


def test_00_seed_data_both_orgs():
    _post("/clients", HA, {"name": NAME_A})
    _post("/clients", HB, {"name": NAME_B})
    _post("/galleries", HA, {"title": TITLE_A})
    _post("/galleries", HB, {"title": TITLE_B})
    _post("/store/products", HA, {"name": PROD_A, "price": 10})
    _post("/store/products", HB, {"name": PROD_B, "price": 20})
    _post("/receivables", HA, {"client_name": NAME_A, "total": 100, "received": 100})
    _post("/receivables", HB, {"client_name": NAME_B, "total": 55, "received": 0})


def test_01_crm_isolated():
    a = [c["name"] for c in _get("/clients", HA)]
    b = [c["name"] for c in _get("/clients", HB)]
    assert NAME_A in a and NAME_A not in b
    assert NAME_B in b and NAME_B not in a


def test_02_galleries_isolated():
    a = [g["title"] for g in _get("/galleries", HA)]
    b = [g["title"] for g in _get("/galleries", HB)]
    assert TITLE_A in a and TITLE_A not in b
    assert TITLE_B in b and TITLE_B not in a


def test_03_store_isolated():
    a = [p["name"] for p in _get("/store/products", HA)]
    b = [p["name"] for p in _get("/store/products", HB)]
    assert PROD_A in a and PROD_A not in b
    assert PROD_B in b and PROD_B not in a


def test_04_financeiro_isolated():
    a = [r.get("client_name") for r in _get("/receivables", HA)]
    b = [r.get("client_name") for r in _get("/receivables", HB)]
    assert NAME_A in a and NAME_A not in b
    assert NAME_B in b and NAME_B not in a


def test_05_dashboard_isolated():
    da = _get("/dashboard/stats", HA)
    dbs = _get("/dashboard/stats", HB)
    assert da["total_clients"] > dbs["total_clients"]
    assert dbs["total_clients"] == 1
    assert dbs["total_sessions"] == 0


def test_06_requires_auth():
    for path in ["/clients", "/galleries", "/receivables", "/dashboard/stats",
                 "/store/orders", "/store/products", "/store/categories"]:
        r = requests.get(f"{API}{path}")
        assert r.status_code == 401, f"{path} sem token deveria ser 401, foi {r.status_code}"
    r = requests.post(f"{API}/store/products", json={"name": "x", "price": 1})
    assert r.status_code == 401


def test_07_cross_read_by_id_blocked():
    ga = _post("/galleries", HA, {"title": f"XREF_{TAG}"})
    gid = ga["id"]
    assert requests.get(f"{API}/galleries/{gid}", headers=HB).status_code == 404
    assert requests.get(f"{API}/galleries/{gid}", headers=HA).status_code == 200


def test_08_public_catalog_isolated():
    ga = _post("/galleries", HA, {"title": f"PUBGAL_A_{TAG}"})
    gb = _post("/galleries", HB, {"title": f"PUBGAL_B_{TAG}"})
    ta = _post(f"/galleries/{ga['id']}/share", HA, {})["access_token"]
    tb = _post(f"/galleries/{gb['id']}/share", HB, {})["access_token"]
    pa = [p["name"] for p in _get(f"/public/galleries/{ta}/products", {})]
    pb = [p["name"] for p in _get(f"/public/galleries/{tb}/products", {})]
    assert PROD_A in pa and PROD_A not in pb
    assert PROD_B in pb and PROD_B not in pa


def teardown_module(module):
    db.clients.delete_many({"organization_id": ORG_B_ID})
    db.galleries.delete_many({"organization_id": ORG_B_ID})
    db.products.delete_many({"organization_id": ORG_B_ID})
    db.receivables.delete_many({"organization_id": ORG_B_ID})
    db.users.delete_many({"organization_id": ORG_B_ID})
    db.organization_members.delete_many({"organization_id": ORG_B_ID})
    db.organizations.delete_one({"id": ORG_B_ID})
    db.clients.delete_many({"name": NAME_A})
    db.galleries.delete_many({"title": {"$in": [TITLE_A, f"XREF_{TAG}", f"PUBGAL_A_{TAG}"]}})
    db.products.delete_many({"name": PROD_A})
    db.receivables.delete_many({"client_name": NAME_A})
