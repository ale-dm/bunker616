import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@features/auth/AuthContext';
import { ThemeProvider } from '@shared/theme';
import { loadCustomCovers } from '@features/library/coverStore';
import { reportQueryResult } from '@features/network/serverStatus';
import { OfflineBanner } from '@shared/components';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: error => reportQueryResult(error),
    onSuccess: () => reportQueryResult(null),
  }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [coversReady, setCoversReady] = useState(false);
  useEffect(() => {
    loadCustomCovers().finally(() => setCoversReady(true));
  }, []);

  if (!coversReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
            <OfflineBanner />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
