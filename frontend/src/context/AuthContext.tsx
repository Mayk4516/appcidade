import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "@/src/utils/storage";
import { User, UserRole } from "@/src/types";

const TOKEN_KEY = "urbanpulse_auth_token";
const USER_KEY = "urbanpulse_auth_user";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  updateUserFavorites: (saved_stores: string[]) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  switchDemoRole: async () => {},
  updateUserFavorites: () => {},
});

export const DEMO_USERS: Record<UserRole, { email: string; pass: string; name: string }> = {
  user: {
    email: "user@cidadehub.com",
    pass: "user123",
    name: "Camila Silva (Consumidor)",
  },
  store_owner: {
    email: "lojista@cidadehub.com",
    pass: "lojista123",
    name: "Marcelo Oliveira (Lojista)",
  },
  super_admin: {
    email: "admin@cidadehub.com",
    pass: "admin123",
    name: "Administrador Geral (Super Admin)",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const savedToken = await storage.secureGet(TOKEN_KEY, null);
        const savedUser = await storage.getItem(USER_KEY, null);

        if (savedToken && savedUser) {
          setToken(savedToken as string);
          setUser(savedUser as User);
        }
      } catch (error) {
        console.warn("Failed to load auth state", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await storage.secureSet(TOKEN_KEY, newToken);
    await storage.setItem(USER_KEY, newUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
  };

  const updateUserFavorites = (saved_stores: string[]) => {
    if (user) {
      const updated = { ...user, saved_stores };
      setUser(updated);
      storage.setItem(USER_KEY, updated);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    const creds = DEMO_USERS[role];
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "";
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: creds.email, password: creds.pass }),
    });
    if (!res.ok) {
      throw new Error("Não foi possível entrar com a conta demo. Tente novamente.");
    }
    const data = await res.json();
    await login(data.access_token, data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchDemoRole,
        updateUserFavorites,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
