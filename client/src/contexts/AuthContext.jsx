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

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    resetAuthForcedLogoutSignal();
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    resetAuthForcedLogoutSignal();
    setUser(null);
  }, []);

  // On mount, check if token exists and hydrate user.
  useEffect(() => {
    let mounted = true;

    const token = localStorage.getItem('token');
    if (token) {
      authAPI
        .getMe()
        .then((data) => {
          if (!mounted) return;
          resetAuthForcedLogoutSignal();
          setUser(data.user);
        })
        .catch((err) => {
          if (!mounted) return;

          // Blocked responses are handled globally by API interceptors.
          if (!err?.response?.data?.blocked) {
            localStorage.removeItem('token');
            resetAuthForcedLogoutSignal();
          }

          setUser(null);
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    } else {
      resetAuthForcedLogoutSignal();
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Handle forced logout events emitted by the API layer (e.g. blocked account).
  useEffect(() => {
    const handleForcedLogout = () => {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
      window.location.assign('/login?blocked=1');
    };

    window.addEventListener(AUTH_FORCED_LOGOUT_EVENT, handleForcedLogout);
    return () => {
      window.removeEventListener(AUTH_FORCED_LOGOUT_EVENT, handleForcedLogout);
    };
  }, []);

  // Periodically revalidate current session so blocked users are logged out quickly
  // even if they are idle and not triggering other API requests.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    const validateSession = () => {
      authAPI.getMe().catch(() => {
        // Global interceptors handle blocked/invalid sessions.
      });
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    }, 15000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };

    const onWindowFocus = () => {
      validateSession();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
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
