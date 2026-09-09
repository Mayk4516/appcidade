import os
import uuid
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

import jwt
from passlib.context import CryptContext
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "cidade_hub_db")
JWT_SECRET = os.environ.get("JWT_SECRET", "urban-pulse-cidade-hub-secret-key-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------
# Emergent Managed Object Storage
# ---------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "cidade-hub"
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="UrbanPulse CityHub API")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------
# Models & Schemas
# ---------------------------------------------------------

class UserRole:
    USER = "user"
    STORE_OWNER = "store_owner"
    SUPER_ADMIN = "super_admin"

class PlanTier:
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = UserRole.USER
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = ""
    saved_stores: List[str] = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class Category(BaseModel):
    id: str
    slug: str
    name: str
    icon: str
    description: str
    store_count: int = 0
    order: int = 0

class StoreAddress(BaseModel):
    street: str = ""
    number: str = ""
    neighborhood: str = ""
    city: str = "São Paulo"
    state: str = "SP"
    zip_code: Optional[str] = ""
    formatted: Optional[str] = ""

class StoreContact(BaseModel):
    phone: str = ""
    whatsapp: str = ""
    instagram: Optional[str] = ""
    website: Optional[str] = ""
    email: Optional[str] = ""

class StoreHour(BaseModel):
    open: str = "08:00"
    close: str = "18:00"
    is_closed: bool = False

class StoreCreate(BaseModel):
    name: str
    category_id: str
    subcategory: Optional[str] = ""
    description: str = ""
    short_description: str = ""
    logo_url: Optional[str] = ""
    banner_url: Optional[str] = ""
    address: StoreAddress
    contact: StoreContact
    hours: Dict[str, StoreHour] = {}
    plan_tier: Optional[str] = PlanTier.FREE

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    featured_banner_url: Optional[str] = None
    address: Optional[StoreAddress] = None
    contact: Optional[StoreContact] = None
    hours: Optional[Dict[str, StoreHour]] = None
    plan_tier: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    promo_price: Optional[float] = None
    image_url: Optional[str] = ""
    category: Optional[str] = "Geral"
    is_available: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    promo_price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str

class PlanUpgradeRequest(BaseModel):
    plan_tier: str  # "pro" | "premium"
    period: str = "monthly"  # "monthly" | "yearly"

# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id})
        return user
    except Exception:
        return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    user = await get_current_user_optional(credentials)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado ou token inválido")
    if user.get("disabled", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta desativada")
    return user

def require_role(*allowed_roles: str):
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado para este perfil")
        return user
    return role_checker

def format_user_profile(user: Dict[str, Any]) -> UserProfile:
    return UserProfile(
        id=user.get("id", ""),
        name=user.get("name", ""),
        email=user.get("email", ""),
        role=user.get("role", UserRole.USER),
        phone=user.get("phone", ""),
        saved_stores=user.get("saved_stores", []),
        created_at=user.get("created_at", datetime.now(timezone.utc).isoformat())
    )

def clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    doc = dict(doc)
    if "_id" in doc:
        del doc["_id"]
    return doc

# ---------------------------------------------------------
# Seed Data Initialization
# ---------------------------------------------------------

SEED_CATEGORIES = [
    {"id": "cat_gastronomia", "slug": "gastronomia", "name": "Gastronomia & Restaurantes", "icon": "utensils", "description": "Pizzarias, hamburguerias, bistrôs, cafés e restaurantes locais", "order": 1},
    {"id": "cat_moda", "slug": "moda", "name": "Moda & Acessórios", "icon": "shirt", "description": "Boutiques de roupas, calçados, joias e vestuário", "order": 2},
    {"id": "cat_beleza", "slug": "saude-beleza", "name": "Saúde & Beleza", "icon": "sparkles", "description": "Salões, barbearias, clínicas de estética e farmácias", "order": 3},
    {"id": "cat_mercado", "slug": "supermercados", "name": "Mercados & Conveniência", "icon": "shopping-cart", "description": "Supermercados, hortifrutis, padarias e empórios", "order": 4},
    {"id": "cat_servicos", "slug": "servicos", "name": "Serviços & Reparos", "icon": "wrench", "description": "Oficinas, assistência técnica, marcenaria e reformas", "order": 5},
    {"id": "cat_pet", "slug": "pet-shop", "name": "Pet Shop & Veterinária", "icon": "paw-print", "description": "Clínicas veterinárias, banho & tosa e rações", "order": 6},
    {"id": "cat_decoracao", "slug": "casa-decoracao", "name": "Casa & Construção", "icon": "home", "description": "Móveis, tintas, materiais de construção e decoração", "order": 7},
    {"id": "cat_tecnologia", "slug": "tecnologia", "name": "Tecnologia & Celulares", "icon": "smartphone", "description": "Smartphones, computadores e periféricos", "order": 8},
]

SEED_PLANS = {
    "free": {
        "tier": "free",
        "name": "Plano Grátis",
        "price": 0.0,
        "price_display": "R$ 0/mês",
        "description": "Ideal para começar a marcar presença digital na cidade",
        "max_products": 5,
        "is_verified": False,
        "is_featured": False,
        "has_banner": False,
        "has_advanced_metrics": False,
        "features": [
            "Até 5 produtos no catálogo",
            "Botão direto de WhatsApp",
            "Endereço e horários de funcionamento",
            "Avaliações de clientes",
            "Listagem padrão por categoria"
        ]
    },
    "pro": {
        "tier": "pro",
        "name": "Plano Pro",
        "price": 79.0,
        "price_display": "R$ 79/mês",
        "description": "Para lojistas que querem mais visibilidade e credibilidade",
        "max_products": 25,
        "is_verified": True,
        "is_featured": False,
        "has_banner": True,
        "has_advanced_metrics": True,
        "features": [
            "Até 25 produtos no catálogo",
            "Selo de Loja Verificada",
            "Banner customizado no perfil",
            "Métricas de cliques (WhatsApp, Telefone, Rotas)",
            "Prioridade nas buscas por categoria",
            "Suporte prioritário via WhatsApp"
        ]
    },
    "premium": {
        "tier": "premium",
        "name": "Plano Premium VIP",
        "price": 149.0,
        "price_display": "R$ 149/mês",
        "description": "Máximo destaque na cidade e leads garantidos para seu negócio",
        "max_products": 100,
        "is_verified": True,
        "is_featured": True,
        "has_banner": True,
        "has_advanced_metrics": True,
        "features": [
            "Catálogo ilimitado (até 100 itens)",
            "Destaque VIP no topo da Página Inicial",
            "Selo Verificado Ouro",
            "Banner em destaque rotativo",
            "Relatórios completos de conversão e visitas",
            "Badge 'Loja Recomendada'",
            "Gerente de conta exclusivo"
        ]
    }
}

async def seed_database():
    try:
        # 1. Seed Categories
        for cat in SEED_CATEGORIES:
            await db.categories.update_one({"id": cat["id"]}, {"$set": cat}, upsert=True)

        # 2. Seed Users
        demo_users = [
            {"id": "user_1", "email": "user@cidadehub.com", "name": "Camila Silva", "password": "user123", "role": UserRole.USER, "phone": "(11) 98765-4321", "saved_stores": ["store_1", "store_3"]},
            {"id": "owner_1", "email": "lojista@cidadehub.com", "name": "Marcelo Oliveira (Lojista)", "password": "lojista123", "role": UserRole.STORE_OWNER, "phone": "(11) 99123-4567", "saved_stores": []},
            {"id": "admin_1", "email": "admin@cidadehub.com", "name": "Administrador Geral", "password": "admin123", "role": UserRole.SUPER_ADMIN, "phone": "(11) 99999-8888", "saved_stores": []},
        ]
        for u in demo_users:
            doc = {
                "id": u["id"],
                "email": u["email"].lower().strip(),
                "name": u["name"],
                "hashed_password": hash_password(u["password"]),
                "role": u["role"],
                "phone": u["phone"],
                "saved_stores": u["saved_stores"],
                "disabled": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.update_one({"email": doc["email"]}, {"$set": doc}, upsert=True)

        # 3. Seed Demo Stores
        demo_stores = [
            {
                "id": "store_1",
                "name": "Bistrô & Forneria Bella Vita",
                "slug": "bistro-bella-vita",
                "owner_id": "owner_1",
                "category_id": "cat_gastronomia",
                "category_name": "Gastronomia & Restaurantes",
                "subcategory": "Pizzaria Artesanal & Massas",
                "description": "Pizzas no forno a lenha com fermentação natural de 48h, massas frescas e carta de vinhos selecionada. Venha saborear a verdadeira culinária italiana no coração da cidade.",
                "short_description": "Pizzas artesanais napolitanas e massas frescas",
                "logo_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=400&auto=format&fit=crop",
                "banner_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop",
                "featured_banner_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop",
                "address": {
                    "street": "Av. Paulista",
                    "number": "1420",
                    "neighborhood": "Bela Vista",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip_code": "01310-100",
                    "formatted": "Av. Paulista, 1420 - Bela Vista, São Paulo - SP"
                },
                "contact": {
                    "phone": "(11) 3288-9900",
                    "whatsapp": "5511987654321",
                    "instagram": "@bellavita.forneria",
                    "website": "https://bellavita.com.br",
                    "email": "contato@bellavita.com.br"
                },
                "hours": {
                    "monday": {"open": "18:00", "close": "23:30", "is_closed": False},
                    "tuesday": {"open": "18:00", "close": "23:30", "is_closed": False},
                    "wednesday": {"open": "18:00", "close": "23:30", "is_closed": False},
                    "thursday": {"open": "18:00", "close": "23:30", "is_closed": False},
                    "friday": {"open": "18:00", "close": "00:30", "is_closed": False},
                    "saturday": {"open": "12:00", "close": "01:00", "is_closed": False},
                    "sunday": {"open": "12:00", "close": "23:00", "is_closed": False}
                },
                "plan_tier": PlanTier.PREMIUM,
                "is_verified": True,
                "is_featured": True,
                "rating": 4.9,
                "review_count": 48,
                "status": "active",
                "metrics": {
                    "views_count": 1420,
                    "whatsapp_clicks": 384,
                    "phone_clicks": 96,
                    "directions_clicks": 215,
                    "favorites_count": 89
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "store_2",
                "name": "Urban Style Boutique & Moda",
                "slug": "urban-style-boutique",
                "owner_id": "owner_1",
                "category_id": "cat_moda",
                "category_name": "Moda & Acessórios",
                "subcategory": "Moda Casual & Streetwear",
                "description": "Roupas femininas e masculinas com as últimas tendências internacionais. Peças exclusivas, calçados premium e acessórios contemporâneos.",
                "short_description": "Moda urbana contemporânea, calçados e acessórios",
                "logo_url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&auto=format&fit=crop",
                "banner_url": "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=1000&auto=format&fit=crop",
                "featured_banner_url": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1200&auto=format&fit=crop",
                "address": {
                    "street": "Rua Oscar Freire",
                    "number": "850",
                    "neighborhood": "Jardins",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip_code": "01426-000",
                    "formatted": "Rua Oscar Freire, 850 - Jardins, São Paulo - SP"
                },
                "contact": {
                    "phone": "(11) 3081-4455",
                    "whatsapp": "5511991234567",
                    "instagram": "@urbanstyle.sp",
                    "website": "https://urbanstyle.com.br",
                    "email": "vendas@urbanstyle.com.br"
                },
                "hours": {
                    "monday": {"open": "10:00", "close": "20:00", "is_closed": False},
                    "tuesday": {"open": "10:00", "close": "20:00", "is_closed": False},
                    "wednesday": {"open": "10:00", "close": "20:00", "is_closed": False},
                    "thursday": {"open": "10:00", "close": "20:00", "is_closed": False},
                    "friday": {"open": "10:00", "close": "21:00", "is_closed": False},
                    "saturday": {"open": "10:00", "close": "21:00", "is_closed": False},
                    "sunday": {"open": "12:00", "close": "18:00", "is_closed": False}
                },
                "plan_tier": PlanTier.PRO,
                "is_verified": True,
                "is_featured": False,
                "rating": 4.8,
                "review_count": 32,
                "status": "active",
                "metrics": {
                    "views_count": 890,
                    "whatsapp_clicks": 182,
                    "phone_clicks": 45,
                    "directions_clicks": 110,
                    "favorites_count": 54
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "store_3",
                "name": "Barbearia Imperial Classic",
                "slug": "barbearia-imperial",
                "owner_id": "owner_1",
                "category_id": "cat_beleza",
                "category_name": "Saúde & Beleza",
                "subcategory": "Cortes Clássicos, Barboterapia & Spa",
                "description": "Ambiente vintage requintado com profissionais de alta precisão. Corte de cabelo, barba com toalha quente, pigmentação e tratamentos capilares.",
                "short_description": "Corte de cabelo masculino, barba e barboterapia",
                "logo_url": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=400&auto=format&fit=crop",
                "banner_url": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1000&auto=format&fit=crop",
                "featured_banner_url": "",
                "address": {
                    "street": "Rua Augusta",
                    "number": "2200",
                    "neighborhood": "Consolação",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip_code": "01412-000",
                    "formatted": "Rua Augusta, 2200 - Consolação, São Paulo - SP"
                },
                "contact": {
                    "phone": "(11) 3255-7788",
                    "whatsapp": "5511976543210",
                    "instagram": "@barbearia.imperial",
                    "website": "",
                    "email": "agenda@imperialbarber.com.br"
                },
                "hours": {
                    "monday": {"open": "09:00", "close": "20:00", "is_closed": False},
                    "tuesday": {"open": "09:00", "close": "20:00", "is_closed": False},
                    "wednesday": {"open": "09:00", "close": "20:00", "is_closed": False},
                    "thursday": {"open": "09:00", "close": "21:00", "is_closed": False},
                    "friday": {"open": "09:00", "close": "21:00", "is_closed": False},
                    "saturday": {"open": "09:00", "close": "20:00", "is_closed": False},
                    "sunday": {"open": "09:00", "close": "14:00", "is_closed": True}
                },
                "plan_tier": PlanTier.PREMIUM,
                "is_verified": True,
                "is_featured": True,
                "rating": 4.9,
                "review_count": 65,
                "status": "active",
                "metrics": {
                    "views_count": 1250,
                    "whatsapp_clicks": 410,
                    "phone_clicks": 80,
                    "directions_clicks": 165,
                    "favorites_count": 72
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "store_4",
                "name": "Empório Gourmet Sabores da Terra",
                "slug": "emporio-sabores-da-terra",
                "owner_id": "owner_1",
                "category_id": "cat_mercado",
                "category_name": "Mercados & Conveniência",
                "subcategory": "Queijos Artesanais, Vinhos & Pães",
                "description": "Produtos orgânicos selecionados, queijos da Serra da Canastra, azeites importados, cafés especiais moídos na hora e pães de fermentação natural.",
                "short_description": "Queijos premiados, cafés especiais e vinhos finos",
                "logo_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400&auto=format&fit=crop",
                "banner_url": "https://images.unsplash.com/photo-1506484381205-f7945653044d?q=80&w=1000&auto=format&fit=crop",
                "featured_banner_url": "",
                "address": {
                    "street": "Alameda Lorena",
                    "number": "1304",
                    "neighborhood": "Jardim Paulista",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip_code": "01424-001",
                    "formatted": "Alameda Lorena, 1304 - Jardim Paulista, São Paulo - SP"
                },
                "contact": {
                    "phone": "(11) 3887-1234",
                    "whatsapp": "5511988887777",
                    "instagram": "@emporio.saboresdaterra",
                    "website": "",
                    "email": "contato@saboresdaterra.com.br"
                },
                "hours": {
                    "monday": {"open": "07:30", "close": "20:00", "is_closed": False},
                    "tuesday": {"open": "07:30", "close": "20:00", "is_closed": False},
                    "wednesday": {"open": "07:30", "close": "20:00", "is_closed": False},
                    "thursday": {"open": "07:30", "close": "20:00", "is_closed": False},
                    "friday": {"open": "07:30", "close": "20:30", "is_closed": False},
                    "saturday": {"open": "08:00", "close": "20:00", "is_closed": False},
                    "sunday": {"open": "08:00", "close": "15:00", "is_closed": False}
                },
                "plan_tier": PlanTier.FREE,
                "is_verified": False,
                "is_featured": False,
                "rating": 4.6,
                "review_count": 19,
                "status": "active",
                "metrics": {
                    "views_count": 420,
                    "whatsapp_clicks": 85,
                    "phone_clicks": 20,
                    "directions_clicks": 62,
                    "favorites_count": 28
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "store_5",
                "name": "VetCare & Pet Boutique",
                "slug": "vetcare-pet-boutique",
                "owner_id": "owner_1",
                "category_id": "cat_pet",
                "category_name": "Pet Shop & Veterinária",
                "subcategory": "Clínica 24h, Estética Pet & Rações",
                "description": "Atendimento veterinário humanizado 24 horas, centro cirúrgico moderno, banho e tosa com água aquecida e boutique completa com caminhas e brinquedos.",
                "short_description": "Clínica veterinária 24h, banho e tosa premium",
                "logo_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=400&auto=format&fit=crop",
                "banner_url": "https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=1000&auto=format&fit=crop",
                "featured_banner_url": "",
                "address": {
                    "street": "Rua Fradique Coutinho",
                    "number": "600",
                    "neighborhood": "Pinheiros",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip_code": "05416-000",
                    "formatted": "Rua Fradique Coutinho, 600 - Pinheiros, São Paulo - SP"
                },
                "contact": {
                    "phone": "(11) 3032-9090",
                    "whatsapp": "5511999991122",
                    "instagram": "@vetcare.pinheiros",
                    "website": "https://vetcare.com.br",
                    "email": "emergencia@vetcare.com.br"
                },
                "hours": {
                    "monday": {"open": "00:00", "close": "23:59", "is_closed": False},
                    "tuesday": {"open": "00:00", "close": "23:59", "is_closed": False},
                    "wednesday": {"open": "00:00", "close": "23:59", "is_closed": False},
                    "thursday": {"open": "00:00", "close": "23:59", "is_closed": False},
                    "friday": {"open": "00:00", "close": "23:59", "is_closed": False},
                    "saturday": {"open": "00:00", "close": "23:59", "is_closed": False},
                    "sunday": {"open": "00:00", "close": "23:59", "is_closed": False}
                },
                "plan_tier": PlanTier.PRO,
                "is_verified": True,
                "is_featured": False,
                "rating": 4.9,
                "review_count": 41,
                "status": "active",
                "metrics": {
                    "views_count": 780,
                    "whatsapp_clicks": 230,
                    "phone_clicks": 115,
                    "directions_clicks": 140,
                    "favorites_count": 49
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        for s in demo_stores:
            await db.stores.update_one({"id": s["id"]}, {"$set": s}, upsert=True)

        # 4. Seed Demo Products
        demo_products = [
            {"id": "prod_1", "store_id": "store_1", "name": "Pizza Napolitana Margherita D.O.P.", "description": "Molho de tomate San Marzano, mozzarella di bufala fresca, manjericão fresco e azeite extravirgem.", "price": 78.0, "promo_price": 68.0, "image_url": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=600&auto=format&fit=crop", "category": "Pizzas Especiais", "is_available": True, "order": 1},
            {"id": "prod_2", "store_id": "store_1", "name": "Gnocchi Artesanal ao Ragu de Costela", "description": "Massa leve de batata asterix feita na casa com ragu de costela cozida lentamente por 8 horas.", "price": 64.0, "promo_price": None, "image_url": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600&auto=format&fit=crop", "category": "Massas Frescas", "is_available": True, "order": 2},
            {"id": "prod_3", "store_id": "store_1", "name": "Burrata com Pesto & Tomatinhos Confit", "description": "Burrata cremosa de 250g servida com focaccia quente da casa, pesto genovês e tomatinhos.", "price": 56.0, "promo_price": 49.9, "image_url": "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?q=80&w=600&auto=format&fit=crop", "category": "Entradas", "is_available": True, "order": 3},
            {"id": "prod_4", "store_id": "store_1", "name": "Tiramisù Clássico Italiano", "description": "Camadas de biscoito savoiardi embebidos em espresso, creme de mascarpone e cacau belga 70%.", "price": 32.0, "promo_price": None, "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=600&auto=format&fit=crop", "category": "Sobremesas", "is_available": True, "order": 4},
            {"id": "prod_5", "store_id": "store_2", "name": "Jaqueta Bomber Streetwear Impermeável", "description": "Jaqueta com tecido corta-vento de alta densidade, forro térmico e bolsos funcionais.", "price": 289.0, "promo_price": 249.0, "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop", "category": "Inverno", "is_available": True, "order": 1},
            {"id": "prod_6", "store_id": "store_2", "name": "Sneaker Chunky Urban Leather", "description": "Tênis em couro legítimo com solado anatômico ultra leve e palmilha com memória de impacto.", "price": 349.0, "promo_price": None, "image_url": "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop", "category": "Calçados", "is_available": True, "order": 2},
            {"id": "prod_7", "store_id": "store_3", "name": "Combo Real: Corte Degradê + Barboterapia", "description": "Corte moderno na tesoura ou máquina + toalha quente, óleo essencial, massagem facial e navalha.", "price": 110.0, "promo_price": 95.0, "image_url": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600&auto=format&fit=crop", "category": "Combos", "is_available": True, "order": 1},
            {"id": "prod_8", "store_id": "store_3", "name": "Barboterapia Tradicional com Toalha Quente", "description": "Desenho e alinhamento de barba com produtos exclusivos da linha premium para barbear.", "price": 55.0, "promo_price": None, "image_url": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop", "category": "Barba", "is_available": True, "order": 2},
        ]
        for p in demo_products:
            await db.products.update_one({"id": p["id"]}, {"$set": p}, upsert=True)

        # 5. Seed Demo Reviews
        demo_reviews = [
            {"id": "rev_1", "store_id": "store_1", "user_id": "user_1", "user_name": "Camila Silva", "rating": 5, "comment": "A melhor pizza da cidade! Atendimento excelente pelo WhatsApp e entrega super rápida no capricho.", "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()},
            {"id": "rev_2", "store_id": "store_1", "user_id": "user_2", "user_name": "Rodrigo Alves", "rating": 5, "comment": "Massa super leve e sabor autêntico. O tiramisù é espetacular!", "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()},
            {"id": "rev_3", "store_id": "store_2", "user_id": "user_1", "user_name": "Camila Silva", "rating": 5, "comment": "Roupas lindas e de altíssima qualidade. Atendimento nota 10 pelo WhatsApp.", "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
            {"id": "rev_4", "store_id": "store_3", "user_id": "user_3", "user_name": "Gustavo Lima", "rating": 5, "comment": "Experiência impecável. Barboterapia relaxante e corte perfeito.", "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()},
        ]
        for r in demo_reviews:
            await db.reviews.update_one({"id": r["id"]}, {"$set": r}, upsert=True)

        logger.info("Database successfully seeded with demo data!")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")

@app.on_event("startup")
async def startup_event():
    try:
        init_storage()
        logger.info("Object storage initialized.")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed_database()


# ---------------------------------------------------------
# Media Upload / Download (Emergent Object Storage)
# ---------------------------------------------------------
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"}


@api_router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Envie uma imagem JPG, PNG ou WEBP.")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagem muito grande (máx. 8MB).")
    ext = (file.filename or "img.jpg").split(".")[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "heic"}:
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4().hex}.{ext}"
    try:
        await run_in_threadpool(put_object, path, data, content_type)
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else 500
        if code == 402:
            raise HTTPException(status_code=402, detail="Sem créditos de armazenamento no momento.")
        raise HTTPException(status_code=502, detail="Falha ao enviar imagem.")
    return {"path": path, "url": f"/api/files/{path}"}


@api_router.get("/files/{file_path:path}")
async def get_media(file_path: str):
    # Store logos/banners/product photos are public marketplace assets.
    try:
        content, content_type = await run_in_threadpool(get_object, file_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return Response(content=content, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})

# ---------------------------------------------------------
# Authentication Routes
# ---------------------------------------------------------

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado na plataforma.")

    user_id = f"user_{uuid.uuid4().hex[:8]}"
    role = data.role if data.role in [UserRole.USER, UserRole.STORE_OWNER] else UserRole.USER

    user_doc = {
        "id": user_id,
        "email": email,
        "name": data.name,
        "hashed_password": hash_password(data.password),
        "role": role,
        "phone": data.phone or "",
        "saved_stores": [],
        "disabled": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id, role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=format_user_profile(user_doc)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if user.get("disabled", False):
        raise HTTPException(status_code=403, detail="Conta suspensa.")

    token = create_token(user["id"], user.get("role", UserRole.USER))
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=format_user_profile(user)
    )

@api_router.get("/auth/me", response_model=UserProfile)
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return format_user_profile(user)

@api_router.post("/auth/seed")
async def trigger_seed():
    await seed_database()
    return {"message": "Banco de dados sincronizado com sucesso!"}

# ---------------------------------------------------------
# Categories Routes
# ---------------------------------------------------------

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find().sort("order", 1).to_list(100)
    # Count active stores per category
    for cat in categories:
        count = await db.stores.count_documents({"category_id": cat["id"], "status": "active"})
        cat["store_count"] = count
    return [clean_doc(c) for c in categories]

# ---------------------------------------------------------
# Stores Routes (Public / Consumer)
# ---------------------------------------------------------

@api_router.get("/stores")
async def list_stores(
    category_id: Optional[str] = None,
    query: Optional[str] = None,
    city: Optional[str] = None,
    featured_only: Optional[bool] = False,
    verified_only: Optional[bool] = False,
    sort_by: Optional[str] = "featured"  # "featured", "rating", "newest", "views"
):
    filter_query: Dict[str, Any] = {"status": "active"}

    if category_id and category_id != "all":
        filter_query["category_id"] = category_id
    if city:
        filter_query["address.city"] = {"$regex": city, "$options": "i"}
    if verified_only:
        filter_query["is_verified"] = True
    if featured_only:
        filter_query["is_featured"] = True

    if query:
        filter_query["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"subcategory": {"$regex": query, "$options": "i"}},
            {"address.neighborhood": {"$regex": query, "$options": "i"}}
        ]

    cursor = db.stores.find(filter_query)

    if sort_by == "rating":
        cursor = cursor.sort([("rating", -1), ("review_count", -1)])
    elif sort_by == "views":
        cursor = cursor.sort("metrics.views_count", -1)
    elif sort_by == "newest":
        cursor = cursor.sort("created_at", -1)
    else:  # featured first, then premium plan, then rating
        cursor = cursor.sort([("is_featured", -1), ("rating", -1)])

    stores = await cursor.to_list(200)
    return [clean_doc(s) for s in stores]

@api_router.get("/stores/{store_id}")
async def get_store_detail(store_id: str):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    # Increment view metric asynchronously
    await db.stores.update_one({"id": store_id}, {"$inc": {"metrics.views_count": 1}})

    return clean_doc(store)

@api_router.post("/stores/{store_id}/click")
async def track_store_click(store_id: str, channel: str = Query(..., regex="^(whatsapp|phone|directions|share)$")):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    metric_field = f"metrics.{channel}_clicks" if channel in ["whatsapp", "phone", "directions"] else "metrics.views_count"
    await db.stores.update_one({"id": store_id}, {"$inc": {metric_field: 1}})
    return {"status": "ok", "channel": channel}

@api_router.post("/stores/{store_id}/favorite")
async def toggle_favorite(store_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    saved = user.get("saved_stores", [])
    if store_id in saved:
        saved.remove(store_id)
        is_favorite = False
        await db.stores.update_one({"id": store_id}, {"$inc": {"metrics.favorites_count": -1}})
    else:
        saved.append(store_id)
        is_favorite = True
        await db.stores.update_one({"id": store_id}, {"$inc": {"metrics.favorites_count": 1}})

    await db.users.update_one({"id": user_id}, {"$set": {"saved_stores": saved}})
    return {"is_favorite": is_favorite, "saved_stores": saved}

@api_router.get("/user/favorites")
async def get_user_favorites(user: Dict[str, Any] = Depends(get_current_user)):
    saved_ids = user.get("saved_stores", [])
    if not saved_ids:
        return []
    stores = await db.stores.find({"id": {"$in": saved_ids}, "status": "active"}).to_list(100)
    return [clean_doc(s) for s in stores]

@api_router.get("/stores/{store_id}/products")
async def get_store_products(store_id: str):
    products = await db.products.find({"store_id": store_id}).sort("order", 1).to_list(200)
    return [clean_doc(p) for p in products]

@api_router.get("/stores/{store_id}/reviews")
async def get_store_reviews(store_id: str):
    reviews = await db.reviews.find({"store_id": store_id}).sort("created_at", -1).to_list(100)
    return [clean_doc(r) for r in reviews]

@api_router.post("/stores/{store_id}/reviews")
async def add_store_review(store_id: str, data: ReviewCreate, user: Dict[str, Any] = Depends(get_current_user)):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")

    rev_id = f"rev_{uuid.uuid4().hex[:8]}"
    review_doc = {
        "id": rev_id,
        "store_id": store_id,
        "user_id": user["id"],
        "user_name": user.get("name", "Cliente"),
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)

    # Recalculate store rating
    all_revs = await db.reviews.find({"store_id": store_id}).to_list(500)
    avg_rating = round(sum(r["rating"] for r in all_revs) / len(all_revs), 1) if all_revs else 5.0
    await db.stores.update_one(
        {"id": store_id},
        {"$set": {"rating": avg_rating, "review_count": len(all_revs)}}
    )

    return clean_doc(review_doc)

# ---------------------------------------------------------
# Store Owner Flow (Lojista SaaS Management)
# ---------------------------------------------------------

@api_router.get("/owner/stores")
async def get_owner_stores(user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    if user.get("role") == UserRole.SUPER_ADMIN:
        stores = await db.stores.find().to_list(200)
    else:
        stores = await db.stores.find({"owner_id": user["id"]}).to_list(50)
    return [clean_doc(s) for s in stores]

@api_router.post("/owner/stores")
async def create_owner_store(data: StoreCreate, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store_id = f"store_{uuid.uuid4().hex[:8]}"
    slug = data.name.lower().replace(" ", "-").replace("&", "e")

    # Fetch category name
    cat = await db.categories.find_one({"id": data.category_id})
    cat_name = cat["name"] if cat else "Geral"

    tier = data.plan_tier or PlanTier.FREE
    plan_info = SEED_PLANS.get(tier, SEED_PLANS["free"])

    store_doc = {
        "id": store_id,
        "name": data.name,
        "slug": slug,
        "owner_id": user["id"],
        "category_id": data.category_id,
        "category_name": cat_name,
        "subcategory": data.subcategory or "",
        "description": data.description or "",
        "short_description": data.short_description or "",
        "logo_url": data.logo_url or "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&auto=format&fit=crop",
        "banner_url": data.banner_url or "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop",
        "featured_banner_url": "",
        "address": data.address.dict(),
        "contact": data.contact.dict(),
        "hours": {k: v.dict() for k, v in data.hours.items()} if data.hours else {
            "monday": {"open": "08:00", "close": "18:00", "is_closed": False},
            "tuesday": {"open": "08:00", "close": "18:00", "is_closed": False},
            "wednesday": {"open": "08:00", "close": "18:00", "is_closed": False},
            "thursday": {"open": "08:00", "close": "18:00", "is_closed": False},
            "friday": {"open": "08:00", "close": "18:00", "is_closed": False},
            "saturday": {"open": "08:00", "close": "13:00", "is_closed": False},
            "sunday": {"open": "08:00", "close": "13:00", "is_closed": True}
        },
        "plan_tier": tier,
        "is_verified": plan_info["is_verified"],
        "is_featured": plan_info["is_featured"],
        "rating": 5.0,
        "review_count": 0,
        "status": "active",
        "metrics": {
            "views_count": 0,
            "whatsapp_clicks": 0,
            "phone_clicks": 0,
            "directions_clicks": 0,
            "favorites_count": 0
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stores.insert_one(store_doc)
    return clean_doc(store_doc)

@api_router.put("/owner/stores/{store_id}")
async def update_owner_store(store_id: str, data: StoreUpdate, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    if user.get("role") != UserRole.SUPER_ADMIN and store.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Você não tem permissão para editar esta loja")

    update_dict: Dict[str, Any] = {}
    for k, v in data.dict(exclude_unset=True).items():
        if v is not None:
            update_dict[k] = v

    if "category_id" in update_dict:
        cat = await db.categories.find_one({"id": update_dict["category_id"]})
        if cat:
            update_dict["category_name"] = cat["name"]

    if update_dict:
        await db.stores.update_one({"id": store_id}, {"$set": update_dict})

    updated = await db.stores.find_one({"id": store_id})
    return clean_doc(updated)

@api_router.get("/owner/stores/{store_id}/metrics")
async def get_store_metrics(store_id: str, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    if user.get("role") != UserRole.SUPER_ADMIN and store.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Não autorizado")

    metrics = store.get("metrics", {
        "views_count": 0, "whatsapp_clicks": 0, "phone_clicks": 0, "directions_clicks": 0, "favorites_count": 0
    })
    products_count = await db.products.count_documents({"store_id": store_id})
    reviews_count = await db.reviews.count_documents({"store_id": store_id})

    # Conversion rate: whatsapp + phone clicks / views
    views = max(1, metrics.get("views_count", 0))
    leads = metrics.get("whatsapp_clicks", 0) + metrics.get("phone_clicks", 0)
    conversion_rate = round((leads / views) * 100, 1)

    return {
        "store_id": store_id,
        "metrics": metrics,
        "total_leads": leads,
        "conversion_rate_pct": conversion_rate,
        "products_count": products_count,
        "reviews_count": reviews_count,
        "current_plan": store.get("plan_tier", "free"),
        "is_verified": store.get("is_verified", False),
        "is_featured": store.get("is_featured", False)
    }

@api_router.post("/owner/stores/{store_id}/products")
async def create_store_product(store_id: str, data: ProductCreate, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    if user.get("role") != UserRole.SUPER_ADMIN and store.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Não autorizado")

    # Check SaaS limits
    tier = store.get("plan_tier", PlanTier.FREE)
    max_prods = SEED_PLANS.get(tier, SEED_PLANS["free"])["max_products"]
    curr_count = await db.products.count_documents({"store_id": store_id})
    if curr_count >= max_prods:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de {max_prods} produtos atingido no {SEED_PLANS[tier]['name']}. Faça upgrade para adicionar mais produtos!"
        )

    prod_id = f"prod_{uuid.uuid4().hex[:8]}"
    product_doc = {
        "id": prod_id,
        "store_id": store_id,
        "name": data.name,
        "description": data.description or "",
        "price": data.price,
        "promo_price": data.promo_price,
        "image_url": data.image_url or "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop",
        "category": data.category or "Geral",
        "is_available": data.is_available,
        "order": curr_count + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return clean_doc(product_doc)

@api_router.put("/owner/stores/{store_id}/products/{product_id}")
async def update_store_product(store_id: str, product_id: str, data: ProductUpdate, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    if user.get("role") != UserRole.SUPER_ADMIN and store.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Não autorizado")

    update_dict = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if update_dict:
        await db.products.update_one({"id": product_id, "store_id": store_id}, {"$set": update_dict})

    updated = await db.products.find_one({"id": product_id})
    return clean_doc(updated)

@api_router.delete("/owner/stores/{store_id}/products/{product_id}")
async def delete_store_product(store_id: str, product_id: str, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    if user.get("role") != UserRole.SUPER_ADMIN and store.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Não autorizado")

    await db.products.delete_one({"id": product_id, "store_id": store_id})
    return {"status": "deleted", "product_id": product_id}

@api_router.post("/owner/stores/{store_id}/upgrade-plan")
async def upgrade_store_plan(store_id: str, data: PlanUpgradeRequest, user: Dict[str, Any] = Depends(require_role(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN))):
    store = await db.stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    if user.get("role") != UserRole.SUPER_ADMIN and store.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Não autorizado")

    tier = data.plan_tier
    if tier not in SEED_PLANS:
        raise HTTPException(status_code=400, detail="Plano inválido")

    plan_info = SEED_PLANS[tier]
    update_data = {
        "plan_tier": tier,
        "is_verified": plan_info["is_verified"],
        "is_featured": plan_info["is_featured"],
        "plan_upgraded_at": datetime.now(timezone.utc).isoformat(),
        "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    await db.stores.update_one({"id": store_id}, {"$set": update_data})

    # Record upgrade event
    await db.saas_upgrades.insert_one({
        "id": f"upg_{uuid.uuid4().hex[:8]}",
        "store_id": store_id,
        "owner_id": user["id"],
        "plan_tier": tier,
        "price": plan_info["price"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    updated = await db.stores.find_one({"id": store_id})
    return {
        "message": f"Parabéns! Sua loja foi atualizada com sucesso para o {plan_info['name']}!",
        "store": clean_doc(updated),
        "plan": plan_info
    }

# ---------------------------------------------------------
# Super Admin Governance Flow
# ---------------------------------------------------------

@api_router.get("/admin/metrics")
async def get_admin_metrics(user: Dict[str, Any] = Depends(require_role(UserRole.SUPER_ADMIN))):
    total_stores = await db.stores.count_documents({})
    active_stores = await db.stores.count_documents({"status": "active"})
    pro_stores = await db.stores.count_documents({"plan_tier": PlanTier.PRO})
    premium_stores = await db.stores.count_documents({"plan_tier": PlanTier.PREMIUM})
    free_stores = await db.stores.count_documents({"plan_tier": PlanTier.FREE})
    total_users = await db.users.count_documents({})

    # Calculate MRR (Monthly Recurring Revenue)
    mrr = (pro_stores * 79.0) + (premium_stores * 149.0)

    # Calculate total leads generated across all stores
    pipeline = [
        {"$group": {
            "_id": None,
            "total_views": {"$sum": "$metrics.views_count"},
            "total_whatsapp": {"$sum": "$metrics.whatsapp_clicks"},
            "total_phone": {"$sum": "$metrics.phone_clicks"},
            "total_directions": {"$sum": "$metrics.directions_clicks"}
        }}
    ]
    agg = await db.stores.aggregate(pipeline).to_list(1)
    leads_data = agg[0] if agg else {"total_views": 0, "total_whatsapp": 0, "total_phone": 0, "total_directions": 0}

    return {
        "total_stores": total_stores,
        "active_stores": active_stores,
        "total_users": total_users,
        "mrr": mrr,
        "mrr_formatted": f"R$ {mrr:,.2f}",
        "plans_distribution": {
            "free": free_stores,
            "pro": pro_stores,
            "premium": premium_stores
        },
        "total_views": leads_data.get("total_views", 0),
        "total_whatsapp_leads": leads_data.get("total_whatsapp", 0),
        "total_phone_leads": leads_data.get("total_phone", 0),
        "total_directions_clicks": leads_data.get("total_directions", 0)
    }

@api_router.get("/admin/stores")
async def get_admin_stores(
    status_filter: Optional[str] = None,
    tier_filter: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role(UserRole.SUPER_ADMIN))
):
    query: Dict[str, Any] = {}
    if status_filter:
        query["status"] = status_filter
    if tier_filter:
        query["plan_tier"] = tier_filter

    stores = await db.stores.find(query).sort("created_at", -1).to_list(300)
    return [clean_doc(s) for s in stores]

@api_router.patch("/admin/stores/{store_id}")
async def patch_admin_store(
    store_id: str,
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_role(UserRole.SUPER_ADMIN))
):
    allowed_fields = ["status", "is_verified", "is_featured", "plan_tier"]
    update_data = {k: v for k, v in payload.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo válido para atualização")

    await db.stores.update_one({"id": store_id}, {"$set": update_data})
    updated = await db.stores.find_one({"id": store_id})
    return clean_doc(updated)

@api_router.get("/plans")
async def get_saas_plans():
    return list(SEED_PLANS.values())

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
