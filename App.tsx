import React from 'react';
import { Providers } from '@app/Providers';
import { AppLockGate } from '@features/auth/AppLockGate';
import { RootNavigator } from '@navigation/RootNavigator';

function App() {
  return (
    <Providers>
      <AppLockGate>
        <RootNavigator />
      </AppLockGate>
    </Providers>
  );
}

export default App;
