"""Backend tests — Iteration 9: Contas a Pagar (Payables) module.
Covers CRUD, mark-as-paid, overdue status computation, negative amount clamp,
categories endpoint and integration with GET /api/finance/summary
(KPI 'payable' + expenses_by_category + profit/cashflow).
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
class TestPayablesBasics:
    def test_list_payables(self, s):
        r = s.get(f"{API}/payables")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            for k in ("id", "supplier", "description", "category", "amount",
                      "due_date", "status"):
                assert k in item, f"missing key: {k}"
            assert item["status"] in ("pendente", "pago", "vencido", "cancelado")

    def test_list_sorted_ascending_by_due_date(self, s):
        r = s.get(f"{API}/payables")
        assert r.status_code == 200
        dues = [d.get("due_date", "") for d in r.json() if d.get("due_date")]
        assert dues == sorted(dues), "Backend should return sorted asc by due_date"

    def test_categories_endpoint(self, s):
        r = s.get(f"{API}/payables/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) == 16
        expected = {"Equipamentos", "Marketing", "Publicidade", "Transporte", "Combustível",
                    "Alimentação", "Freelancers", "Fotógrafos", "Designers", "Impressões",
                    "Álbuns", "Fornecedores", "Software", "Assinaturas", "Impostos", "Outros"}
        assert set(cats) == expected


# ---------------- CRUD ----------------
class TestPayablesCRUD:
    created_ids = []

    def test_create_pending(self, s):
        payload = {
            "supplier": "TEST_FornecedorA",
            "description": "TEST_Equipamento X",
            "category": "Equipamentos",
            "amount": 250.50,
            "due_date": (date.today() + timedelta(days=15)).isoformat(),
            "method": "Transferência",
            "status": "pendente",
            "notes": "TEST_",
        }
        r = s.post(f"{API}/payables", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["supplier"] == "TEST_FornecedorA"
        assert d["category"] == "Equipamentos"
        assert d["amount"] == 250.50
        assert d["status"] == "pendente"
        TestPayablesCRUD.created_ids.append(d["id"])

    def test_create_overdue_auto_status(self, s):
        payload = {
            "supplier": "TEST_FornecedorVenc",
            "description": "TEST_Atraso",
            "category": "Software",
            "amount": 99.00,
            "due_date": (date.today() - timedelta(days=10)).isoformat(),
            "status": "pendente",
        }
        r = s.post(f"{API}/payables", json=payload)
        assert r.status_code == 200
        d = r.json()
        # status should be auto-computed as "vencido" for pending past due
        assert d["status"] == "vencido"
        TestPayablesCRUD.created_ids.append(d["id"])

    def test_create_paid_stays_pago_even_if_past_due(self, s):
        payload = {
            "supplier": "TEST_PagoAntigo",
            "description": "TEST_Já pago",
            "category": "Outros",
            "amount": 50,
            "due_date": (date.today() - timedelta(days=30)).isoformat(),
            "status": "pago",
            "paid_date": (date.today() - timedelta(days=25)).isoformat(),
        }
        r = s.post(f"{API}/payables", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "pago"  # pago/cancelado shouldn't be flipped to vencido
        TestPayablesCRUD.created_ids.append(d["id"])

    def test_create_cancelled_stays_cancelado(self, s):
        payload = {
            "supplier": "TEST_Cancelado",
            "category": "Outros",
            "amount": 10,
            "due_date": (date.today() - timedelta(days=5)).isoformat(),
            "status": "cancelado",
        }
        r = s.post(f"{API}/payables", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "cancelado"
        TestPayablesCRUD.created_ids.append(d["id"])

    def test_create_negative_amount_clamped(self, s):
        payload = {
            "supplier": "TEST_Negativo",
            "category": "Outros",
            "amount": -777,
            "due_date": (date.today() + timedelta(days=1)).isoformat(),
        }
        r = s.post(f"{API}/payables", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 0, f"Negative amount should be clamped to 0, got {d['amount']}"
        TestPayablesCRUD.created_ids.append(d["id"])

    def test_update_persists(self, s):
        pid = TestPayablesCRUD.created_ids[0]
        payload = {"description": "TEST_editado", "amount": 300.75, "category": "Marketing"}
        r = s.put(f"{API}/payables/{pid}", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["description"] == "TEST_editado"
        assert d["amount"] == 300.75
        assert d["category"] == "Marketing"
        # Verify via list
        lst = s.get(f"{API}/payables").json()
        row = next((x for x in lst if x["id"] == pid), None)
        assert row is not None
        assert row["amount"] == 300.75
        assert row["category"] == "Marketing"

    def test_update_negative_amount_clamped(self, s):
        pid = TestPayablesCRUD.created_ids[0]
        r = s.put(f"{API}/payables/{pid}", json={"amount": -500})
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 0

    def test_mark_as_paid(self, s):
        pid = TestPayablesCRUD.created_ids[1]  # started as vencido
        r = s.post(f"{API}/payables/{pid}/pay", json={"method": "Multibanco"})
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "pago"
        assert d["paid_date"], "paid_date should be set"
        assert d["method"] == "Multibanco"

    def test_mark_paid_404(self, s):
        r = s.post(f"{API}/payables/nonexistent-xyz/pay", json={})
        assert r.status_code == 404

    def test_update_404(self, s):
        r = s.put(f"{API}/payables/nonexistent-xyz", json={"amount": 1})
        assert r.status_code == 404

    def test_delete_payable(self, s):
        # Create throwaway then delete
        r = s.post(f"{API}/payables", json={
            "supplier": "TEST_Delete",
            "category": "Outros",
            "amount": 1,
            "due_date": (date.today() + timedelta(days=5)).isoformat(),
        })
        pid = r.json()["id"]
        r2 = s.delete(f"{API}/payables/{pid}")
        assert r2.status_code == 200
        lst = s.get(f"{API}/payables").json()
        assert not any(x["id"] == pid for x in lst)


# ---------------- Integration with finance summary ----------------
class TestFinanceSummaryIntegration:
    def test_payable_kpi_reflects_open_amounts(self, s):
        UNIQ = 876543
        r = s.post(f"{API}/payables", json={
            "supplier": "TEST_KPI_UNIQ_PAYABLE",
            "description": "TEST_KPI",
            "category": "Software",
            "amount": UNIQ,
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "status": "pendente",
        })
        assert r.status_code == 200
        pid = r.json()["id"]

        after = s.get(f"{API}/finance/summary").json()
        assert after["payable"] >= UNIQ, (
            f"KPI payable ({after['payable']}) should include the {UNIQ} open payable"
        )
        after_pay = after["payable"]

        # Mark as paid — KPI payable must decrease by ~UNIQ
        s.post(f"{API}/payables/{pid}/pay", json={"method": "Transferência"})
        paid = s.get(f"{API}/finance/summary").json()
        assert round(after_pay - paid["payable"], 2) >= UNIQ - 1, (
            f"KPI payable should drop by ~{UNIQ} after paying "
            f"(before={after_pay}, after={paid['payable']})"
        )
        # And expenses_by_category should have the Software bucket bumped by ~UNIQ
        soft = next((x["value"] for x in paid["expenses_by_category"] if x["name"] == "Software"), 0)
        assert soft >= UNIQ - 1, f"Software bucket ({soft}) should include the {UNIQ} paid payable"

        # Cleanup
        s.delete(f"{API}/payables/{pid}")

    def test_overdue_included_in_payable_kpi(self, s):
        UNIQ = 654321
        r = s.post(f"{API}/payables", json={
            "supplier": "TEST_OVERDUE_KPI",
            "category": "Outros",
            "amount": UNIQ,
            "due_date": (date.today() - timedelta(days=3)).isoformat(),
            "status": "pendente",
        })
        pid = r.json()["id"]
        # It should be vencido after view
        summary = s.get(f"{API}/finance/summary").json()
        assert summary["payable"] >= UNIQ, "Overdue payable must be included in KPI"

        s.delete(f"{API}/payables/{pid}")

    def test_cancelled_not_included_in_payable_kpi(self, s):
        UNIQ = 111222
        # baseline
        base = s.get(f"{API}/finance/summary").json()["payable"]
        r = s.post(f"{API}/payables", json={
            "supplier": "TEST_CANC",
            "category": "Outros",
            "amount": UNIQ,
            "due_date": (date.today() + timedelta(days=10)).isoformat(),
            "status": "cancelado",
        })
        pid = r.json()["id"]
        after = s.get(f"{API}/finance/summary").json()["payable"]
        # Cancelled shouldn't add UNIQ (allow small parallel-test noise)
        assert (after - base) < UNIQ / 2, (
            f"Cancelled payable must NOT be added to KPI (before={base}, after={after}, UNIQ={UNIQ})"
        )
        s.delete(f"{API}/payables/{pid}")

    def test_summary_has_expected_keys(self, s):
        r = s.get(f"{API}/finance/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue_month", "receivable", "payable", "profit", "cashflow",
                  "revenue_chart", "expenses_by_category"):
            assert k in d


# ---------------- Cleanup ----------------
def test_zz_cleanup(s):
    """Remove any leftover TEST_ payables at end of module."""
    lst = s.get(f"{API}/payables").json()
    for p in lst:
        if (str(p.get("supplier", "")).startswith("TEST_") or
                str(p.get("description", "")).startswith("TEST_") or
                str(p.get("notes", "")).startswith("TEST_")):
            s.delete(f"{API}/payables/{p['id']}")
