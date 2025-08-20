import React from 'react';
import Routes from './Routes';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;