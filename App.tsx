import React from 'react';
import { Providers } from '@app/Providers';
import { RootNavigator } from '@navigation/RootNavigator';

function App() {
  return (
    <Providers>
      <RootNavigator />
    </Providers>
  );
}

export default App;
