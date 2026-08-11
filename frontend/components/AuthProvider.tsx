"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_EXPIRED_EVENT, api } from "@/lib/api";

type AuthUser = { id: number; username: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_CHECK_MS = 60 * 1000;

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const loggingOutRef = useRef(false);
  const isLoginPage = pathname === "/login";

  const clearLocalSession = useCallback(async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      try {
        await api.logout();
      } catch {
        // still clear local session
      }
      await clearLocalSession();
    } finally {
      setUser(null);
      setExpiresAt(null);
      loggingOutRef.current = false;
      router.replace("/login");
    }
  }, [clearLocalSession, router]);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser({ id: me.id, username: me.username });
      if (typeof me.expiresAt === "number") {
        setExpiresAt(me.expiresAt);
      }
    } catch {
      setUser(null);
      setExpiresAt(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await api.me();
        if (!cancelled) {
          setUser({ id: me.id, username: me.username });
          if (typeof me.expiresAt === "number") {
            setExpiresAt(me.expiresAt);
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setExpiresAt(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [loading, user, isLoginPage, router]);

  // Auto-logout when session token expires (1 hour)
  useEffect(() => {
    if (!user || !expiresAt) return;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      void logout();
      return;
    }

    const timer = window.setTimeout(() => {
      void logout();
    }, remaining + 250);

    return () => window.clearTimeout(timer);
  }, [user, expiresAt, logout]);

  // Periodic session check in case the tab stays open past expiry
  useEffect(() => {
    if (!user) return;

    const id = window.setInterval(() => {
      void (async () => {
        try {
          const me = await api.me();
          if (typeof me.expiresAt === "number") {
            setExpiresAt(me.expiresAt);
          }
        } catch {
          await clearLocalSession();
          setUser(null);
          setExpiresAt(null);
          router.replace("/login");
        }
      })();
    }, SESSION_CHECK_MS);

    return () => window.clearInterval(id);
  }, [user, clearLocalSession, router]);

  // Any API 401 (expired/invalid session) forces logout
  useEffect(() => {
    const onExpired = () => {
      if (loggingOutRef.current) return;
      void logout();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      const me = await api.login({ username, password });
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: me.token }),
        });
      } catch {
        // Backend cookie may still be enough for API calls
      }
      setUser({ id: me.id, username: me.username });
      setExpiresAt(
        typeof me.expiresAt === "number"
          ? me.expiresAt
          : Date.now() + 60 * 60 * 1000
      );
      router.replace("/");
    },
    [router]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  );

  if (loading) {
    return (
      <div className="auth-loading">
        <p className="loading">Loading...</p>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return (
      <div className="auth-loading">
        <p className="loading">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
