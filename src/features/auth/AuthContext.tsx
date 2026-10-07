import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosInstance } from 'axios';
import { ServerCredentials, ServerProfile } from '@shared/types/komga';
import { createApiClient } from '@shared/api/client';
import { getCurrentUser } from '@shared/api/komga';

// Los perfiles (incluidas las contraseñas) se guardan todos juntos como un
// único valor JSON en el Keychain; cuál es el activo es un dato no sensible
// y vive en AsyncStorage.
const KEYCHAIN_SERVICE = 'bunker616.servers';
const ACTIVE_SERVER_KEY = 'bunker616.activeServerId';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  servers: ServerProfile[];
  activeServer: ServerProfile | null;
  credentials: ServerCredentials | null;
  api: AxiosInstance | null;
  error: string | null;
  addServer: (credentials: ServerCredentials) => Promise<void>;
  switchServer: (id: string) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readServers(): Promise<ServerProfile[]> {
  const stored = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored.password) as ServerProfile[];
  } catch {
    return [];
  }
}

async function writeServers(servers: ServerProfile[]): Promise<void> {
  if (servers.length === 0) {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    return;
  }
  await Keychain.setGenericPassword('bunker616', JSON.stringify(servers), {
    service: KEYCHAIN_SERVICE,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [servers, setServers] = useState<ServerProfile[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedServers = await readServers();
        const storedActiveId = await AsyncStorage.getItem(ACTIVE_SERVER_KEY);
        setServers(storedServers);
        if (storedServers.length > 0) {
          const active = storedServers.find(s => s.id === storedActiveId) ?? storedServers[0];
          setActiveServerId(active.id);
          setStatus('signedIn');
        } else {
          setStatus('signedOut');
        }
      } catch {
        setStatus('signedOut');
      }
    })();
  }, []);

  const addServer = useCallback(async (creds: ServerCredentials) => {
    setError(null);
    const api = createApiClient(creds);
    // Validar contra el servidor antes de guardar nada.
    await getCurrentUser(api);
    const profile: ServerProfile = { ...creds, id: `${Date.now()}` };
    setServers(prev => {
      const next = [...prev, profile];
      writeServers(next);
      return next;
    });
    setActiveServerId(profile.id);
    await AsyncStorage.setItem(ACTIVE_SERVER_KEY, profile.id);
    setStatus('signedIn');
  }, []);

  const switchServer = useCallback(async (id: string) => {
    setActiveServerId(id);
    await AsyncStorage.setItem(ACTIVE_SERVER_KEY, id);
  }, []);

  const removeServer = useCallback(
    async (id: string) => {
      const next = servers.filter(s => s.id !== id);
      setServers(next);
      await writeServers(next);

      if (id === activeServerId) {
        const fallback = next[0] ?? null;
        setActiveServerId(fallback?.id ?? null);
        if (fallback) {
          await AsyncStorage.setItem(ACTIVE_SERVER_KEY, fallback.id);
        } else {
          await AsyncStorage.removeItem(ACTIVE_SERVER_KEY);
          setStatus('signedOut');
        }
      }
    },
    [servers, activeServerId],
  );

  const activeServer = useMemo(
    () => servers.find(s => s.id === activeServerId) ?? null,
    [servers, activeServerId],
  );

  const api = useMemo(
    () => (activeServer ? createApiClient(activeServer) : null),
    [activeServer],
  );

  const value: AuthContextValue = {
    status,
    servers,
    activeServer,
    credentials: activeServer,
    api,
    error,
    addServer,
    switchServer,
    removeServer,
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
