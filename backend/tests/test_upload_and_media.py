"""
Iteration 4 review tests:
- POST /api/upload (auth + multipart) returns {path, url}
- GET /api/files/{path} returns image bytes (200 + content-type image/*)
- POST /api/upload without token -> 401/403
- Owner create/update store persists logo_url / banner_url
- Owner create/update product persists image_url
- Home ordering: premium/is_featured stores come first
"""

import io
import os
import uuid
import struct
import zlib
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")


def _png_bytes() -> bytes:
    # Minimal valid 1x1 red PNG (hand-crafted, no external deps).
    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00" + b"\xff\x00\x00"  # filter byte + one RGB pixel
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


def login(email: str, password: str):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"], r.json()["user"]


# ---------- Upload ----------
class TestUpload:
    def test_upload_without_token_forbidden(self):
        files = {"file": ("x.png", io.BytesIO(_png_bytes()), "image/png")}
        r = requests.post(f"{BASE_URL}/api/upload", files=files, timeout=20)
        assert r.status_code in (401, 403), r.text

    def test_upload_and_fetch_image(self):
        token, _ = login("lojista@cidadehub.com", "lojista123")
        files = {"file": (f"TEST_{uuid.uuid4().hex[:6]}.png", io.BytesIO(_png_bytes()), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and "url" in body
        assert body["url"].startswith("/api/files/")

        get_r = requests.get(f"{BASE_URL}{body['url']}", timeout=30)
        assert get_r.status_code == 200, get_r.text
        ctype = get_r.headers.get("content-type", "")
        assert ctype.startswith("image/"), f"unexpected content-type {ctype}"
        assert len(get_r.content) > 0

    def test_upload_rejects_non_image(self):
        token, _ = login("lojista@cidadehub.com", "lojista123")
        files = {"file": ("x.txt", io.BytesIO(b"not an image"), "text/plain")}
        r = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        assert r.status_code == 400


# ---------- Owner store persists logo_url & banner_url ----------
class TestOwnerStorePersistence:
    def test_create_and_update_store_persists_media(self):
        token, _ = login("lojista@cidadehub.com", "lojista123")
        h = {"Authorization": f"Bearer {token}"}

        cats = requests.get(f"{BASE_URL}/api/categories", timeout=15).json()
        assert cats
        cat_id = cats[0]["id"]

        logo = "/api/files/CidadeHub/uploads/test/TEST_LOGO.png"
        banner = "/api/files/CidadeHub/uploads/test/TEST_BANNER.png"
        payload = {
            "name": f"TEST_Store_{uuid.uuid4().hex[:6]}",
            "category_id": cat_id,
            "subcategory": "Teste",
            "description": "loja de teste",
            "short_description": "teste",
            "logo_url": logo,
            "banner_url": banner,
            "address": {"street": "Rua X", "number": "1", "neighborhood": "Centro", "city": "São Paulo", "state": "SP"},
            "contact": {"phone": "1111", "whatsapp": "1111"},
            "plan_tier": "free",
        }
        created = requests.post(f"{BASE_URL}/api/owner/stores", headers=h, json=payload, timeout=20)
        assert created.status_code == 200, created.text
        store = created.json()
        assert store["logo_url"] == logo
        assert store["banner_url"] == banner
        sid = store["id"]

        # GET verify persistence
        detail = requests.get(f"{BASE_URL}/api/stores/{sid}", timeout=15)
        assert detail.status_code == 200
        assert detail.json()["logo_url"] == logo
        assert detail.json()["banner_url"] == banner

        # PUT update media
        new_logo = "/api/files/CidadeHub/uploads/test/TEST_LOGO2.png"
        new_banner = "/api/files/CidadeHub/uploads/test/TEST_BANNER2.png"
        upd = requests.put(
            f"{BASE_URL}/api/owner/stores/{sid}",
            headers=h,
            json={"logo_url": new_logo, "banner_url": new_banner},
            timeout=20,
        )
        assert upd.status_code == 200, upd.text
        assert upd.json()["logo_url"] == new_logo
        assert upd.json()["banner_url"] == new_banner

        # Re-fetch to confirm persistence
        detail2 = requests.get(f"{BASE_URL}/api/stores/{sid}", timeout=15).json()
        assert detail2["logo_url"] == new_logo
        assert detail2["banner_url"] == new_banner


# ---------- Product image_url persists ----------
class TestProductImagePersistence:
    def test_create_and_update_product_image(self):
        token, _ = login("lojista@cidadehub.com", "lojista123")
        h = {"Authorization": f"Bearer {token}"}
        stores = requests.get(f"{BASE_URL}/api/owner/stores", headers=h, timeout=15).json()
        assert stores
        sid = stores[0]["id"]

        img = "/api/files/CidadeHub/uploads/test/TEST_PROD.png"
        created = requests.post(
            f"{BASE_URL}/api/owner/stores/{sid}/products",
            headers=h,
            json={"name": f"TEST_Prod_{uuid.uuid4().hex[:5]}", "price": 9.9, "image_url": img},
            timeout=20,
        )
        assert created.status_code == 200, created.text
        prod = created.json()
        assert prod["image_url"] == img
        pid = prod["id"]

        new_img = "/api/files/CidadeHub/uploads/test/TEST_PROD2.png"
        upd = requests.put(
            f"{BASE_URL}/api/owner/stores/{sid}/products/{pid}",
            headers=h,
            json={"image_url": new_img},
            timeout=20,
        )
        assert upd.status_code == 200, upd.text
        assert upd.json()["image_url"] == new_img

        # Confirm via public products endpoint
        listing = requests.get(f"{BASE_URL}/api/stores/{sid}/products", timeout=15).json()
        found = [p for p in listing if p["id"] == pid]
        assert found and found[0]["image_url"] == new_img

        # cleanup
        requests.delete(f"{BASE_URL}/api/owner/stores/{sid}/products/{pid}", headers=h, timeout=15)


# ---------- Home ordering: premium first ----------
class TestHomePremiumOrdering:
    def test_default_listing_pins_premium_or_featured_first(self):
        stores = requests.get(f"{BASE_URL}/api/stores", timeout=15).json()
        assert stores
        first = stores[0]
        assert first.get("is_featured") is True or first.get("plan_tier") == "premium", (
            f"expected premium/featured store first, got {first.get('name')} tier={first.get('plan_tier')} featured={first.get('is_featured')}"
        )
