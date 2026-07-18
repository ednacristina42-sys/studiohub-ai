"""Backend tests — Iteration 8: Contas a Receber (Receivables) module.
Covers CRUD, partial payment, mark-as-paid, status transitions and
integration with GET /api/finance/summary (KPI 'receivable').
"""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------- Basics ----------------
class TestReceivablesBasics:
    def test_list_receivables(self, s):
        r = s.get(f"{API}/receivables")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            for k in ("id", "client_name", "total", "received", "balance", "status", "due_date", "method"):
                assert k in item, f"missing key: {k}"
            assert item["status"] in ("pendente", "parcial", "pago", "vencido")

    def test_list_default_sort_ascending_by_due_date(self, s):
        r = s.get(f"{API}/receivables")
        assert r.status_code == 200
        dues = [d.get("due_date", "") for d in r.json() if d.get("due_date")]
        assert dues == sorted(dues), "Backend should return sorted asc by due_date"


# ---------------- CRUD ----------------
class TestReceivablesCRUD:
    created_ids = []

    def test_create_receivable_pending(self, s):
        payload = {
            "client_name": "TEST_ClienteA",
            "project": "TEST_Projeto A",
            "total": 1000,
            "received": 0,
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "method": "Transferência",
        }
        r = s.post(f"{API}/receivables", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["client_name"] == "TEST_ClienteA"
        assert d["total"] == 1000
        assert d["received"] == 0
        assert d["balance"] == 1000
        assert d["status"] == "pendente"
        TestReceivablesCRUD.created_ids.append(d["id"])

    def test_create_receivable_overdue(self, s):
        payload = {
            "client_name": "TEST_ClienteVenc",
            "project": "TEST_Vencido",
            "total": 500,
            "received": 0,
            "due_date": (date.today() - timedelta(days=5)).isoformat(),
            "method": "MB Way",
        }
        r = s.post(f"{API}/receivables", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "vencido"
        assert d["balance"] == 500
        TestReceivablesCRUD.created_ids.append(d["id"])

    def test_update_receivable_persists(self, s):
        rid = TestReceivablesCRUD.created_ids[0]
        payload = {"project": "TEST_Projeto A (editado)", "total": 1200, "method": "Multibanco"}
        r = s.put(f"{API}/receivables/{rid}", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 1200
        assert d["project"] == "TEST_Projeto A (editado)"
        assert d["method"] == "Multibanco"
        # Verify persistence via GET list
        lst = s.get(f"{API}/receivables").json()
        row = next((x for x in lst if x["id"] == rid), None)
        assert row is not None
        assert row["total"] == 1200
        assert row["balance"] == 1200

    def test_partial_payment_changes_status_to_parcial(self, s):
        rid = TestReceivablesCRUD.created_ids[0]
        r = s.post(f"{API}/receivables/{rid}/payment", json={"amount": 300, "method": "MB Way"})
        assert r.status_code == 200
        d = r.json()
        assert d["received"] == 300
        assert d["balance"] == 900
        assert d["status"] == "parcial"

    def test_partial_payment_invalid_amount_returns_400(self, s):
        rid = TestReceivablesCRUD.created_ids[0]
        r = s.post(f"{API}/receivables/{rid}/payment", json={"amount": 0, "method": "MB Way"})
        assert r.status_code == 400

    def test_mark_as_paid_sets_status_pago(self, s):
        rid = TestReceivablesCRUD.created_ids[1]  # vencido
        r = s.post(f"{API}/receivables/{rid}/pay", json={"method": "Dinheiro"})
        assert r.status_code == 200
        d = r.json()
        assert d["received"] == d["total"] == 500
        assert d["balance"] == 0
        assert d["status"] == "pago"
        # Verify a payment record was pushed for the outstanding balance
        # (indirectly by getting the row)
        lst = s.get(f"{API}/receivables").json()
        row = next(x for x in lst if x["id"] == rid)
        assert row["status"] == "pago"

    def test_payment_capped_at_total(self, s):
        rid = TestReceivablesCRUD.created_ids[0]
        r = s.post(f"{API}/receivables/{rid}/payment", json={"amount": 999999, "method": "Cartão"})
        assert r.status_code == 200
        d = r.json()
        assert d["received"] == d["total"]  # capped
        assert d["balance"] == 0
        assert d["status"] == "pago"

    def test_delete_receivable(self, s):
        # Create a throwaway then delete
        r = s.post(f"{API}/receivables", json={
            "client_name": "TEST_Delete",
            "total": 100,
            "due_date": (date.today() + timedelta(days=10)).isoformat(),
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        r2 = s.delete(f"{API}/receivables/{rid}")
        assert r2.status_code == 200
        lst = s.get(f"{API}/receivables").json()
        assert not any(x["id"] == rid for x in lst)


# ---------------- Integration with finance summary ----------------
class TestFinanceSummaryIntegration:
    def test_receivable_kpi_reflects_open_balances(self, s):
        # Use a large, unique amount to detect our own delta despite parallel runs
        UNIQ = 987654
        r = s.post(f"{API}/receivables", json={
            "client_name": "TEST_KPI_UNIQ",
            "project": "TEST_KPI Project",
            "total": UNIQ,
            "received": 0,
            "due_date": (date.today() + timedelta(days=40)).isoformat(),
            "method": "Transferência",
        })
        assert r.status_code == 200
        rid = r.json()["id"]

        after = s.get(f"{API}/finance/summary").json()
        # The KPI must be at least UNIQ (open receivables include our new one)
        assert after["receivable"] >= UNIQ, (
            f"KPI receivable ({after['receivable']}) should include the {UNIQ} open receivable"
        )

        # Pay it fully — KPI should drop by UNIQ vs what it was after create
        after_recv = after["receivable"]
        s.post(f"{API}/receivables/{rid}/pay", json={})
        paid = s.get(f"{API}/finance/summary").json()
        assert round(after_recv - paid["receivable"], 2) >= UNIQ - 1, (
            f"KPI receivable should decrease by ~{UNIQ} after paying (after_recv={after_recv}, after_pay={paid['receivable']})"
        )

        # Cleanup
        s.delete(f"{API}/receivables/{rid}")

    def test_summary_has_expected_keys(self, s):
        r = s.get(f"{API}/finance/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue_month", "receivable", "payable", "profit", "cashflow",
                  "revenue_chart", "expenses_by_category"):
            assert k in d


# ---------------- Cleanup ----------------
def test_zz_cleanup(s):
    """Remove any leftover TEST_ receivables at end of module."""
    lst = s.get(f"{API}/receivables").json()
    for r in lst:
        if str(r.get("client_name", "")).startswith("TEST_") or str(r.get("project", "")).startswith("TEST_"):
            s.delete(f"{API}/receivables/{r['id']}")
