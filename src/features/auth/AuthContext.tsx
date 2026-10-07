import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Keychain from 'react-native-keychain';
import { AxiosInstance } from 'axios';
import { ServerCredentials } from '@shared/types/komga';
import { createApiClient } from '@shared/api/client';
import { getCurrentUser } from '@shared/api/komga';

const KEYCHAIN_SERVICE = 'bunker616.komga';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  credentials: ServerCredentials | null;
  api: AxiosInstance | null;
  error: string | null;
  login: (credentials: ServerCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [credentials, setCredentials] = useState<ServerCredentials | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await Keychain.getGenericPassword({
          service: KEYCHAIN_SERVICE,
        });
        if (stored) {
          const parsed: ServerCredentials = JSON.parse(stored.password);
          setCredentials(parsed);
          setStatus('signedIn');
        } else {
          setStatus('signedOut');
        }
      } catch {
        setStatus('signedOut');
      }
    })();
  }, []);

  const login = useCallback(async (creds: ServerCredentials) => {
    setError(null);
    const api = createApiClient(creds);
    // Validate credentials against the server before persisting them.
    await getCurrentUser(api);
    await Keychain.setGenericPassword('komga', JSON.stringify(creds), {
      service: KEYCHAIN_SERVICE,
    });
    setCredentials(creds);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(async () => {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    setCredentials(null);
    setStatus('signedOut');
  }, []);

  const api = useMemo(
    () => (credentials ? createApiClient(credentials) : null),
    [credentials],
  );

  const value: AuthContextValue = {
    status,
    credentials,
    api,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
