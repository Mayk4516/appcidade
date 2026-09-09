export type UserRole = "user" | "store_owner" | "super_admin";
export type PlanTier = "free" | "pro" | "premium";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  saved_stores?: string[];
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  store_count: number;
  order: number;
}

export interface StoreAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code?: string;
  formatted?: string;
}

export interface StoreContact {
  phone: string;
  whatsapp: string;
  instagram?: string;
  website?: string;
  email?: string;
}

export interface StoreHour {
  open: string;
  close: string;
  is_closed: boolean;
}

export interface StoreMetrics {
  views_count: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  directions_clicks: number;
  favorites_count: number;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  category_id: string;
  category_name: string;
  subcategory?: string;
  description: string;
  short_description: string;
  logo_url: string;
  banner_url: string;
  featured_banner_url?: string;
  address: StoreAddress;
  contact: StoreContact;
  hours: Record<string, StoreHour>;
  plan_tier: PlanTier;
  is_verified: boolean;
  is_featured: boolean;
  rating: number;
  review_count: number;
  status: "active" | "pending" | "suspended";
  metrics: StoreMetrics;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  price: number;
  promo_price?: number | null;
  image_url: string;
  category?: string;
  is_available: boolean;
  order: number;
  created_at: string;
}

export interface Review {
  id: string;
  store_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface SaasPlan {
  tier: PlanTier;
  name: string;
  price: number;
  price_display: string;
  description: string;
  max_products: number;
  is_verified: boolean;
  is_featured: boolean;
  has_banner: boolean;
  has_advanced_metrics: boolean;
  features: string[];
}

export interface AdminMetrics {
  total_stores: number;
  active_stores: number;
  total_users: number;
  mrr: number;
  mrr_formatted: string;
  plans_distribution: {
    free: number;
    pro: number;
    premium: number;
  };
  total_views: number;
  total_whatsapp_leads: number;
  total_phone_leads: number;
  total_directions_clicks: number;
}
