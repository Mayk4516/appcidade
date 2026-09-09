import os
import uuid
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")


def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["access_token"] and data["user"]["email"] == email
    return data["access_token"], data["user"]


def test_auth_roles_and_me():
    for email, password, role in [
        ("user@cidadehub.com", "user123", "user"),
        ("lojista@cidadehub.com", "lojista123", "store_owner"),
        ("admin@cidadehub.com", "admin123", "super_admin"),
    ]:
        token, user = login(email, password)
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200 and r.json()["role"] == role


def test_consumer_search_detail_and_click():
    token, _ = login("user@cidadehub.com", "user123")
    stores = requests.get(f"{BASE_URL}/api/stores", params={"query": "Bella Vita", "verified_only": "true"}, timeout=15)
    assert stores.status_code == 200 and stores.json()
    store_id = stores.json()[0]["id"]
    detail = requests.get(f"{BASE_URL}/api/stores/{store_id}", timeout=15)
    assert detail.status_code == 200 and "contact" in detail.json()
    click = requests.post(f"{BASE_URL}/api/stores/{store_id}/click", params={"channel": "whatsapp"}, timeout=15)
    assert click.status_code == 200 and click.json()["channel"] == "whatsapp"
    fav = requests.post(f"{BASE_URL}/api/stores/{store_id}/favorite", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert fav.status_code == 200 and isinstance(fav.json()["is_favorite"], bool)


def test_owner_metrics_and_product_crud():
    token, _ = login("lojista@cidadehub.com", "lojista123")
    h = {"Authorization": f"Bearer {token}"}
    stores = requests.get(f"{BASE_URL}/api/owner/stores", headers=h, timeout=15)
    assert stores.status_code == 200 and stores.json()
    sid = stores.json()[0]["id"]
    metrics = requests.get(f"{BASE_URL}/api/owner/stores/{sid}/metrics", headers=h, timeout=15)
    assert metrics.status_code == 200 and "conversion_rate_pct" in metrics.json()
    name = f"TEST_{uuid.uuid4().hex[:8]}"
    created = requests.post(f"{BASE_URL}/api/owner/stores/{sid}/products", headers=h, json={"name": name, "price": 12.5}, timeout=15)
    assert created.status_code == 200 and created.json()["name"] == name
    pid = created.json()["id"]
    updated = requests.put(f"{BASE_URL}/api/owner/stores/{sid}/products/{pid}", headers=h, json={"price": 15}, timeout=15)
    assert updated.status_code == 200 and updated.json()["price"] == 15
    deleted = requests.delete(f"{BASE_URL}/api/owner/stores/{sid}/products/{pid}", headers=h, timeout=15)
    assert deleted.status_code == 200


def test_consumer_review_submission_persists():
    token, _ = login("user@cidadehub.com", "user123")
    h = {"Authorization": f"Bearer {token}"}
    store_id = "store_1"
    before = requests.get(f"{BASE_URL}/api/stores/{store_id}/reviews", timeout=15)
    assert before.status_code == 200
    initial_count = len(before.json())
    comment = f"TEST_ review {uuid.uuid4().hex[:6]}"
    created = requests.post(
        f"{BASE_URL}/api/stores/{store_id}/reviews",
        headers=h,
        json={"rating": 4, "comment": comment},
        timeout=15,
    )
    assert created.status_code == 200, created.text
    payload = created.json()
    assert payload["rating"] == 4 and payload["comment"] == comment
    after = requests.get(f"{BASE_URL}/api/stores/{store_id}/reviews", timeout=15)
    assert after.status_code == 200
    comments = [r["comment"] for r in after.json()]
    assert comment in comments
    assert len(after.json()) == initial_count + 1


def test_admin_metrics_and_rbac():
    admin, _ = login("admin@cidadehub.com", "admin123")
    r = requests.get(f"{BASE_URL}/api/admin/metrics", headers={"Authorization": f"Bearer {admin}"}, timeout=15)
    assert r.status_code == 200 and "mrr" in r.json() and "plans_distribution" in r.json()
    user, _ = login("user@cidadehub.com", "user123")
    forbidden = requests.get(f"{BASE_URL}/api/admin/metrics", headers={"Authorization": f"Bearer {user}"}, timeout=15)
    assert forbidden.status_code == 403