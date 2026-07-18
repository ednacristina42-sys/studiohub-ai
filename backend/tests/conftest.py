import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://photo-studio-pro-31.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def ensure_seed(api_client):
    # Ensure demo data exists
    api_client.post(f"{BASE_URL}/api/seed", timeout=30)
    yield
