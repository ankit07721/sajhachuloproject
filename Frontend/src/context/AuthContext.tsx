import {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import api from "@/lib/api";
import { User } from "@/types";
import axios from "axios";

export const AUTH_TOKEN_KEY = "plateful-auth-token";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Is the initial auth check running?
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (token: string, userData: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    // The axios interceptor will handle adding the header for subsequent requests
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // The interceptor in api.ts will add the token to this header
        const response = await api.get("/customers/profile");
        setUser(response.data.data);
      } catch (error) {
        console.error("Auth check failed.", error);
        // Only log out if the error is an authentication error (401/403)
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          logout();
        }
      } finally {
        // We are no longer loading, regardless of the outcome
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
