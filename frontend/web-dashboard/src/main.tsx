import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import 'leaflet/dist/leaflet.css';
import '@/index.css';
import AppRouter from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reuse fresh data for 30 seconds to prevent immediate refetching on every route change
      staleTime: 30000,
      refetchOnMount: false,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      <AppRouter />
    </QueryClientProvider>
  </StrictMode>
);
