import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AUTH_FORCED_LOGOUT_EVENT,
  authAPI,
  resetAuthForcedLogoutSignal,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((userData) => {
    resetAuthForcedLogoutSignal();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Clear local state even if the API call fails.
    }
    resetAuthForcedLogoutSignal();
    setUser(null);
  }, []);

  // On mount, check if the user has a valid session cookie and hydrate user.
  // Skip on the login page with ?blocked=1 to avoid a redirect loop after
  // a forced logout — the blocked notice is already shown from the URL param.
  useEffect(() => {
    let mounted = true;

    const isOnLoginPage =
      window.location.pathname === '/login' &&
      window.location.search.includes('blocked=1');

    if (isOnLoginPage) {
      setLoading(false);
      return;
    }

    authAPI
      .getMe()
      .then((data) => {
        if (!mounted) return;
        resetAuthForcedLogoutSignal();
        setUser(data.user);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle forced logout events emitted by the API layer (e.g. blocked account).
  // Guards against redirecting if already on the login page to prevent a loop.
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      setLoading(false);

      const isOnLoginPage =
        window.location.pathname === '/login' &&
        window.location.search.includes('blocked=1');

      if (!isOnLoginPage) {
        window.location.assign('/login?blocked=1');
      }
    };

    window.addEventListener(AUTH_FORCED_LOGOUT_EVENT, handleForcedLogout);
    return () => {
      window.removeEventListener(AUTH_FORCED_LOGOUT_EVENT, handleForcedLogout);
    };
  }, []);

  // Periodically revalidate session for idle users (blocked accounts, etc.).
  // Active users catch blocked status instantly via the Axios response interceptor
  // on any real API call — this is only a safety net for completely idle tabs.
  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        authAPI.getMe().catch(() => {});
      }
    }, 300000); // 5 minutes

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
