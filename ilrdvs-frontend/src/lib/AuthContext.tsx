import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AppUser } from "../types";
import { getCurrentUser, logout as apiLogout } from "../services/auth.service";
import { tokenStore } from "./tokenStore";

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  isLoading: boolean;
  logout: () => Promise<void>;
  login: (user: AppUser) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const token = tokenStore.getAccess();
      if (!token) {
        if (mounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
        return;
      }
      try {
        const user = await getCurrentUser();
        if (mounted) {
          setCurrentUser(user);
        }
      } catch {
        if (mounted) {
          tokenStore.clear();
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      setCurrentUser(null);
      tokenStore.clear();
    }
  };

  const login = (user: AppUser) => {
    setCurrentUser(user);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.systemRole === "super_admin") return true;
    if (currentUser.permissions && currentUser.permissions.includes(permission)) return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isLoading, logout, login, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
