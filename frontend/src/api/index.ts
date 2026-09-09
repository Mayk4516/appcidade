import { storage } from "@/src/utils/storage";
import { Store, Category, Product, Review, SaasPlan, AdminMetrics } from "@/src/types";

const TOKEN_KEY = "urbanpulse_auth_token";
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await storage.secureGet(TOKEN_KEY, null);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Public & Consumer
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${BACKEND_URL}/api/categories`);
    if (!res.ok) throw new Error("Falha ao carregar categorias");
    return res.json();
  },

  getStores: async (params?: {
    category_id?: string;
    query?: string;
    city?: string;
    featured_only?: boolean;
    verified_only?: boolean;
    sort_by?: string;
  }): Promise<Store[]> => {
    const url = new URL(`${BACKEND_URL}/api/stores`);
    if (params?.category_id && params.category_id !== "all") {
      url.searchParams.append("category_id", params.category_id);
    }
    if (params?.query) url.searchParams.append("query", params.query);
    if (params?.city) url.searchParams.append("city", params.city);
    if (params?.featured_only) url.searchParams.append("featured_only", "true");
    if (params?.verified_only) url.searchParams.append("verified_only", "true");
    if (params?.sort_by) url.searchParams.append("sort_by", params.sort_by);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Falha ao carregar lojas");
    return res.json();
  },

  getStoreDetail: async (storeId: string): Promise<Store> => {
    const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}`);
    if (!res.ok) throw new Error("Loja não encontrada");
    return res.json();
  },

  getStoreProducts: async (storeId: string): Promise<Product[]> => {
    const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}/products`);
    if (!res.ok) throw new Error("Falha ao carregar produtos");
    return res.json();
  },

  getStoreReviews: async (storeId: string): Promise<Review[]> => {
    const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}/reviews`);
    if (!res.ok) throw new Error("Falha ao carregar avaliações");
    return res.json();
  },

  trackStoreClick: async (storeId: string, channel: "whatsapp" | "phone" | "directions" | "share") => {
    try {
      await fetch(`${BACKEND_URL}/api/stores/${storeId}/click?channel=${channel}`, {
        method: "POST",
      });
    } catch {
      // Non-blocking analytics
    }
  },

  toggleFavorite: async (storeId: string): Promise<{ is_favorite: boolean; saved_stores: string[] }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}/favorite`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Faça login para salvar lojas favoritas");
    return res.json();
  },

  getUserFavorites: async (): Promise<Store[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/user/favorites`, { headers });
    if (!res.ok) return [];
    return res.json();
  },

  addReview: async (storeId: string, data: { rating: number; comment: string }): Promise<Review> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/stores/${storeId}/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Erro ao publicar avaliação");
    }
    return res.json();
  },

  getSaasPlans: async (): Promise<SaasPlan[]> => {
    const res = await fetch(`${BACKEND_URL}/api/plans`);
    if (!res.ok) throw new Error("Falha ao carregar planos");
    return res.json();
  },

  // Store Owner (Lojista)
  getOwnerStores: async (): Promise<Store[]> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores`, { headers });
    if (!res.ok) throw new Error("Falha ao carregar suas lojas");
    return res.json();
  },

  createOwnerStore: async (data: any): Promise<Store> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Erro ao cadastrar loja");
    }
    return res.json();
  },

  updateOwnerStore: async (storeId: string, data: any): Promise<Store> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores/${storeId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Erro ao atualizar dados da loja");
    }
    return res.json();
  },

  getOwnerMetrics: async (storeId: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores/${storeId}/metrics`, { headers });
    if (!res.ok) throw new Error("Falha ao obter métricas da loja");
    return res.json();
  },

  createProduct: async (storeId: string, data: any): Promise<Product> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores/${storeId}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Erro ao criar produto");
    }
    return res.json();
  },

  updateProduct: async (storeId: string, productId: string, data: any): Promise<Product> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores/${storeId}/products/${productId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Erro ao editar produto");
    }
    return res.json();
  },

  deleteProduct: async (storeId: string, productId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores/${storeId}/products/${productId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Erro ao excluir produto");
  },

  upgradePlan: async (storeId: string, planTier: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/stores/${storeId}/upgrade-plan`, {
      method: "POST",
      headers,
      body: JSON.stringify({ plan_tier: planTier }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Erro ao atualizar plano");
    }
    return res.json();
  },

  // Super Admin
  getAdminMetrics: async (): Promise<AdminMetrics> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/metrics`, { headers });
    if (!res.ok) throw new Error("Não autorizado para métricas de admin");
    return res.json();
  },

  getAdminStores: async (statusFilter?: string, tierFilter?: string): Promise<Store[]> => {
    const headers = await getAuthHeaders();
    const url = new URL(`${BACKEND_URL}/api/admin/stores`);
    if (statusFilter) url.searchParams.append("status_filter", statusFilter);
    if (tierFilter) url.searchParams.append("tier_filter", tierFilter);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error("Erro ao carregar lojas administrativas");
    return res.json();
  },

  patchAdminStore: async (storeId: string, payload: Record<string, any>): Promise<Store> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/stores/${storeId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao atualizar loja como admin");
    return res.json();
  },
};
